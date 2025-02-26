const express = require('express');
const router = express.Router();
const olap = require('../olap/olap-helper');
const helper = require('./router-helper');

//segment revenue

router.post("/revenue", function(req , res) {
    console.log(req.body);
    if (!req.body || req.body.size > 0) {
        res.json("no body");
        return;
    }

    let query = `
        ${sSegmentRevenueFieldPrefix} 
        , NON EMPTY [Сегменты].[Сегмент].Members  ON ROWS  
        FROM [Чеки]
        WHERE (%cond%, [Сегменты].[Основные сегменты].&[1], [Даты].[Это полный день].&[Да]) 
        `;

    //show for no food and dry the same plan of turnover
    let fixedPlanForTwoSimilarSegments = 'IIF([Сегменты].[Сегмент].CurrentMember is [Сегменты].[Сегмент].[All], ([Сегменты].[Направление менеджера].&[4], [Measures].[План сегмент Оборачиваемость]), [Measures].[План сегмент Оборачиваемость])';
    if (helper.getMDXConditionString(req.body).indexOf('{[Сегменты].[Направление менеджера].&[4],[Сегменты].[Направление менеджера].&[5]}') >= 0) {
        query = query.replace('[Measures].[План сегмент Оборачиваемость]', fixedPlanForTwoSimilarSegments);
    }

    //query = query.replace('SUM(EXISTING([Сегменты].[Сегмент]), [Кол клиентов ])', `IIF([Сегменты].[Сегмент].CurrentMember is [Сегменты].[Сегмент].[All], SUM((${helper.getMDXConditionString(req.body)},${sSegmentAllConditionForSegments}), [Кол клиентов ]), [Кол клиентов ])`);

    doGeneralQueryHandingAndRun(req, res, query);

});

router.post("/revenue-detail", function(req , res) {
    console.log(req.body);
    if (!req.body || req.body.size > 0) {
        res.json("no body");
        return;
    }

    let query = `
        ${sSegmentRevenueFieldPrefix} 
        , NON EMPTY [Даты].[Дата].[Дата] ON ROWS  
        FROM [Чеки] 
        WHERE (%cond%, [Даты].[Это полный день].&[Да]) 
        `;

    if (helper.getMDXConditionString(req.body).indexOf('[Сегменты].[Сегмент]') < 0) {
        //query = query.replace('%cond%', `%cond%, ${sSegmentAllConditionForSegments}`);
        //const commonFilter = olap.convertArrValuesToMDXTupleString(req.body.filterArray);
        //query = query.replace('EXISTING([Сегменты].[Сегмент])', `(${commonFilter ? commonFilter + ',' : ''}${sSegmentAllConditionForSegments})`);
    }

    doGeneralQueryHandingAndRun(req, res, query);
});

router.post("/revenue-detail-expanded", function(req , res) {
    console.log(req.body);
    if (!req.body || req.body.size > 0) {
        res.json("no body");
        return;
    }

    let query = `
        ${sSegmentRevenueFieldPrefix} 
        , NON EMPTY ([Сегменты].[Сегмент].[Сегмент], [Даты].[Дата].[Дата])  ON ROWS  
        FROM [Чеки] 
        WHERE (%cond%, [Сегменты].[Основные сегменты].&[1], [Даты].[Это полный день].&[Да]) 
        `;

    doGeneralQueryHandingAndRun(req, res, query);

});


//todo move into helper
const doGeneralPreHandle = function (req) {
    if (req.body && req.body.periodFilter && helper.isFullMonth(req.body.periodFilter.date, req.body.periodFilter.endDate)) {
        req.body.filterArray.push(
            [
                '[Даты].[Месяцы]',
                [olap.dateToMDX(req.body.periodFilter.date)],
            ],
        );
        req.body.periodFilter = undefined;
    }
};

const doGeneralQueryHandingAndRun = function (req, res, q) {
    const isYearToYear = req.query.isYearToYear === 'true';
    var query = q.replace(/%cond%/gi, req.body && req.body.withSegment310 === true ? '%cond%' : '%cond%, [Сегменты].[Сегмент310].&[0]');

    doGeneralPreHandle(req);

    let condString = helper.getMDXConditionString(req.body);

    let yearToYearPart = '';
    let selectFields = selectBlock;
    if (isYearToYear) {

        const regex = /\[Даты\]\.\[Месяцы\]\.\&\[(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\]/;
        const match = condString.match(regex);

        if (match) {
            let [fullMatch, year, month, day, hour, minute, second] = match;
            let date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
            date.setFullYear(date.getFullYear() - 1);

            let newYear = date.getFullYear();
            const  pastYearDateCond = `[Даты].[Месяцы].&[${newYear}-${month}-${day}T${hour}:${minute}:${second}]`;

            yearToYearPart = yearToYearWithBlock
            selectFields = yeartoYearselectBlock;
            //speed up, not good solution
            if (!query.includes('[Даты].[Дата].[Дата] ON ROWS')) {
                yearToYearPart = yearToYearPart.replace(/SsasRdExtention\.\[ДатыПГП\]\(\)/gi, `(${pastYearDateCond},[Даты].[Это полный день Зеркало].&[True])`)
            }

           // console.log(pastYearDateCond); // Output: [Даты].[Месяцы].&[2023-06-01T00:00:00]
        }
    }




    query = query
        .replace(/%yearToYearPart%/g, yearToYearPart)
        .replace('%cond%', condString)
        .replace(/SELECT\s*\{\s*\}/, `SELECT { ${selectFields} }`);

    helper.handleMdxQueryWithAuth(query, req, res);
};

//const sSegmentAllConditionForSegments = 'EXCEPT([Сегменты].[Сегмент].&[187662]:[Сегменты].[Сегмент].&[133795], {%cond310%})';

const sSegmentRevenueFieldPrefix =
    `
WITH 
MEMBER [План Кол артикулов на 1 клиента] AS
[План сегмент Количество артикулов ]/[План Количество клиентов ]
,FORMAT_STRING = "#,##0.00"

%yearToYearPart%

MEMBER [Кол клиентов ] as SUM(([Даты].[Месяцы].[All],[Даты].[Это полный день].[All], [Даты].[Дата].[All], [Даты чека].[Это полный день].&[Да], 
    
    StrToSet(
    SsasRdExtention.replace(SetToStr([Даты].[Месяцы]), "[Даты]", "[Даты чека]"))) 
    ,
    [Measures].[Кол клиентов прямое])
\t,FORMAT_STRING = "#,##0"


MEMBER [Measures].[План Выручка]
\tAS
\tSUM(SsasRdExtention.[ДатыТП](),
\tCASE
\tWHEN ParallelPeriod([Даты].[Месяцы].[Дата],0).Count = 1 THEN
\tSUM({[Даты].[Месяцы].FirstSibling:[Даты].[Месяцы].CurrentMember},[Measures].[План сегмент Сумма Выручка магазин]) /[ИтогоКолДнейПлана]
\tELSE
\t[План сегмент Сумма Выручка магазин]
\tEND)
\t,FORMAT_STRING = "#,##0.00"
\t
MEMBER [План Количество клиентов ] AS
   SUM(SsasRdExtention.[ДатыТП](),
   CASE
   WHEN ParallelPeriod([Даты].[Месяцы].[Дата],0).Count = 1 THEN
   SUM({[Даты].[Месяцы].FirstSibling:[Даты].[Месяцы]},[Measures].[План сегмент Количество клиентов]) 
   ELSE
   [Measures].[План сегмент Количество клиентов]
   END)
  ,FORMAT_STRING = "#,##0"


MEMBER [План сегмент Количество артикулов ] AS
   SUM(SsasRdExtention.[ДатыТП](),
   CASE
   WHEN ParallelPeriod([Даты].[Месяцы].[Дата],0).Count = 1 THEN
   SUM({[Даты].[Месяцы].FirstSibling:[Даты].[Месяцы].CurrentMember},[Measures].[План сегмент Количество артикулов])
   ELSE
   [Measures].[План сегмент Количество артикулов]
   END)
  ,FORMAT_STRING = "#,##0.00"

  MEMBER [План сегмент Оборачиваемость ] AS
   AVG(CASE
   WHEN ParallelPeriod([Даты].[Месяцы].[Дата],0).Count = 1 THEN
   {[Даты].[Месяцы].FirstSibling:[Даты].[Месяцы].CurrentMember}
   ELSE [Даты].[Месяцы]
   END, [Measures].[План сегмент Оборачиваемость])
  ,FORMAT_STRING = "#,##0.00"

MEMBER [Отклонение выполнение по ВМ от выполнение по ТО] AS
[Выполнение план сегмент Маржа без НДС] - [Выполнение план сегмент Выручка без НДС]

MEMBER [План сегмент уровень маржи] AS
[Measures].[План сегмент Маржа без НДС]/[Measures].[План сегмент Выручка без НДС]
,FORMAT_STRING = "#,##0.00%"

MEMBER [Уровень маржи без НДС] AS 
[Measures].[Маржа без НДС %]/100
,FORMAT_STRING = "#,##0.00%"

MEMBER [Отклонение УВМ от плана] AS
[Уровень маржи без НДС]-[План сегмент уровень маржи]
,FORMAT_STRING = "#,##0.00%"

MEMBER [Кол клиентов Сумма по сегментам] AS
SUM(EXISTING([Сегменты].[Сегмент].[Сегмент]), [Кол клиентов ])
,FORMAT_STRING = "#,##0"

MEMBER [Кол клиентов Сумма по сегментам накопительно] AS
   CASE
   WHEN ParallelPeriod([Даты].[Месяцы].[Дата],0).Count = 1 THEN
   SUM({[Даты].[Месяцы].FirstSibling:[Даты].[Месяцы]},[Кол клиентов Сумма по сегментам]) 
   ELSE
   [Measures].[Кол клиентов Сумма по сегментам]
   END
  ,FORMAT_STRING = "#,##0"

MEMBER [Выполнение плана Кол клиентов] AS
([Кол клиентов Сумма по сегментам накопительно] / [КолДнейПлана]) / ([План Количество клиентов ] /[ИтогоКолДнейПлана])
,FORMAT_STRING = "#,##0.00%"

MEMBER [Кол артикулов накопительно] AS
SUM(SsasRdExtention.[ДатыТП](),
   CASE
   WHEN ParallelPeriod([Даты].[Месяцы].[Дата],0).Count = 1 THEN
   SUM({[Даты].[Месяцы].FirstSibling:[Даты].[Месяцы]},[Measures].[Кол артикулов]) 
   ELSE
   [Measures].[Кол артикулов]
   END)
  ,FORMAT_STRING = "#,##0"

MEMBER [Выполнение плана Кол артикулов] AS
([Кол артикулов накопительно] / [КолДнейПлана])/([План сегмент Количество артикулов ] / [ИтогоКолДнейПлана])
,FORMAT_STRING = "#,##0.00%"

MEMBER [План сегмент Сумма Выручка магазин ] AS
   SUM(SsasRdExtention.[ДатыТП](),
   CASE
   WHEN ParallelPeriod([Даты].[Месяцы].[Дата],0).Count = 1 THEN
   SUM({[Даты].[Месяцы].FirstSibling:[Даты].[Месяцы].CurrentMember},[Measures].[План сегмент Сумма Выручка магазин])
   ELSE
   [План сегмент Сумма Выручка магазин]
   END)
  ,FORMAT_STRING = "#,##0.00"

MEMBER [План сегмент Стоимость одного артикула ] AS
IIF([План сегмент Количество артикулов ], [План сегмент Сумма Выручка магазин ]/[План сегмент Количество артикулов ], NULL)
,FORMAT_STRING = "#,##0.00"

MEMBER [Ср. ст-ть артикула ] AS
CASE
   WHEN ParallelPeriod([Даты].[Месяцы].[Дата],0).Count = 1 THEN
   SUM({[Даты].[Месяцы].FirstSibling:[Даты].[Месяцы]},[Measures].[Сумма])/[Кол артикулов накопительно]
   ELSE
   [Ср. ст-ть артикула]
   END
,FORMAT_STRING = "#,##0.00"

MEMBER [Отклонение от плана Ср. ст-ть артикула] AS
[Ср. ст-ть артикула ] - [План сегмент Стоимость одного артикула ]

MEMBER [Кол артикулов на 1 сум клиента] AS
[Measures].[Кол артикулов накопительно]/[Кол клиентов Сумма по сегментам накопительно]
,FORMAT_STRING = "#,##0.00"

MEMBER [Отклонение от плана Коэф оборачиваемости] AS
IIF([План сегмент Оборачиваемость ] > 0, [Коэф оборачиваемости] - [План сегмент Оборачиваемость ], NULL)
,FORMAT_STRING = "#,##0.00"

MEMBER [Отклонение от плана Кол артикулов на 1 клиента] AS
[Кол артикулов на 1 сум клиента] - [План Кол артикулов на 1 клиента]

MEMBER [Доля Выручки без НДС] AS
[Накопительная выручка за месяц без НДС]/([Сегменты].[Сегмент].[All], [Накопительная выручка за месяц без НДС])
,FORMAT_STRING = "#,##0.00%"

SELECT {

        } ON COLUMNS
`;

const selectBlock = `
    [Measures].[План сегмент Выручка без НДС]
    ,[Measures].[Накопительная выручка за месяц без НДС]
    ,[Measures].[Выполнение план сегмент Выручка без НДС]
    ,[Measures].[Доля Выручки без НДС]
    ,[Measures].[План сегмент Маржа без НДС]
    ,[Measures].[Накопительная маржа за месяц без ндс]
    ,[Measures].[Выполнение план сегмент Маржа без НДС]
    ,[Measures].[Отклонение выполнение по ВМ от выполнение по ТО]
    ,[Measures].[План сегмент уровень маржи]
    ,[Measures].[Уровень маржи без НДС]
    ,[Measures].[Отклонение УВМ от плана]
    ,[Measures].[План Количество клиентов ]
    ,[Measures].[Кол клиентов Сумма по сегментам накопительно]
    ,[Measures].[Выполнение плана Кол клиентов]
    ,[Measures].[План сегмент Количество артикулов ]
    ,[Measures].[Кол артикулов накопительно]
    ,[Measures].[Выполнение плана Кол артикулов]
    ,[Measures].[План сегмент Стоимость одного артикула ]
    ,[Measures].[Ср. ст-ть артикула ]
    ,[Measures].[Отклонение от плана Ср. ст-ть артикула]
    ,[Measures].[План Кол артикулов на 1 клиента]
    ,[Measures].[Кол артикулов на 1 сум клиента]
    ,[Measures].[Отклонение от плана Кол артикулов на 1 клиента]
    ,[Measures].[План сегмент Оборачиваемость ]
    ,[Measures].[Коэф оборачиваемости]
    ,[Measures].[Отклонение от плана Коэф оборачиваемости]
    ,[Measures].[Остаток количество]
    ,[Measures].[Остаток сумма без НДС]
    ,[Measures].[Сумма закупки]
`;

const yearToYearWithBlock = `

--год к году
MEMBER [Прогресс Накопительная выручка за месяц без НДС пгп] AS
IIF ([Сумма] > 0, [Накопительная выручка за полные дни месяца без НДС]/SUM(SsasRdExtention.[ДатыПГП](), [Measures].[Накопительная выручка за месяц без НДС]) - 1, NULL)
,FORMAT_STRING = "#,##0.00%"
MEMBER [Прогресс План сегмент Выручка без НДС пгп] AS
IIF ([Сумма] > 0, [План сегмент Выручка без НДС] /SUM(SsasRdExtention.[ДатыПГП](false), [Measures].[Накопительная выручка за полные дни месяца без НДС]) - 1, NULL)
,FORMAT_STRING = "#,##0.00%"

MEMBER [Прогресс Накопительная маржа за месяц без ндс пгп] AS
IIF ([Сумма] > 0, [Накопительная маржа за полные дни месяца без НДС]/SUM(SsasRdExtention.[ДатыПГП](), [Measures].[Накопительная маржа за месяц без НДС]) - 1, NULL)
,FORMAT_STRING = "#,##0.00%"
MEMBER [Прогресс План сегмент Маржа без НДС пгп] AS
IIF ([Сумма] > 0, [План сегмент Маржа без НДС] / SUM(SsasRdExtention.[ДатыПГП](false), [Measures].[Накопительная маржа за полные дни месяца без НДС]) - 1, NULL)
,FORMAT_STRING = "#,##0.00%"

MEMBER [Прогресс Уровень маржи без НДС пгп] AS
IIF ([Сумма] > 0, [Уровень маржи без НДС] - AVG(SsasRdExtention.[ДатыПГП](), [Measures].[Уровень маржи без НДС]), NULL)
,FORMAT_STRING = "#,##0.00%"
MEMBER [Прогресс План сегмент уровень маржи пгп] AS
IIF ([Сумма] > 0, [План сегмент уровень маржи] - AVG(SsasRdExtention.[ДатыПГП](false), [Measures].[Уровень маржи без НДС]), NULL)
,FORMAT_STRING = "#,##0.00%"

MEMBER [Прогресс Кол клиентов Сумма по сегментам накопительно пгп] AS
IIF ([Сумма] > 0, [Кол клиентов Сумма по сегментам накопительно]/SUM(SsasRdExtention.[ДатыПГП](), [Measures].[Кол клиентов Сумма по сегментам накопительно]) - 1, NULL)
,FORMAT_STRING = "#,##0.00%"
MEMBER [Прогресс План Количество клиентов пгп] AS
IIF ([Сумма] > 0, [План Количество клиентов ]/SUM(SsasRdExtention.[ДатыПГП](false), [Measures].[Кол клиентов Сумма по сегментам накопительно]) - 1, NULL)
,FORMAT_STRING = "#,##0.00%"

MEMBER [Прогресс Кол артикулов накопительно пгп] AS
IIF ([Сумма] > 0, [Кол артикулов накопительно]/SUM(SsasRdExtention.[ДатыПГП](), [Measures].[Кол артикулов накопительно]) - 1, NULL)
,FORMAT_STRING = "#,##0.00%"
MEMBER [Прогресс План сегмент Количество артикулов пгп] AS
IIF ([Сумма] > 0, [План сегмент Количество артикулов ]/SUM(SsasRdExtention.[ДатыПГП](false), [Measures].[Кол артикулов накопительно]) - 1, NULL)
,FORMAT_STRING = "#,##0.00%"

MEMBER [Прогресс Ср. ст-ть артикула пгп] AS
IIF ([Сумма] > 0, [Ср. ст-ть артикула]/AVG(SsasRdExtention.[ДатыПГП](), [Measures].[Ср. ст-ть артикула]) - 1, NULL)
,FORMAT_STRING = "#,##0.00%"
MEMBER [Прогресс План сегмент Стоимость одного артикула пгп] AS
IIF ([Сумма] > 0, [План сегмент Стоимость одного артикула ]/AVG(SsasRdExtention.[ДатыПГП](false), [Measures].[Ср. ст-ть артикула]) - 1, NULL)
,FORMAT_STRING = "#,##0.00%"

MEMBER [Прогресс Кол артикулов на 1 сум клиента пгп] AS
IIF ([Сумма] > 0, [Кол артикулов на 1 сум клиента]/AVG(SsasRdExtention.[ДатыПГП](), [Measures].[Кол артикулов на 1 сум клиента]) - 1, NULL)
,FORMAT_STRING = "#,##0.00%"
MEMBER [Прогресс План Кол артикулов на 1 клиента пгп] AS
IIF ([Сумма] > 0, [План Кол артикулов на 1 клиента]/AVG(SsasRdExtention.[ДатыПГП](false), [Measures].[Кол артикулов на 1 сум клиента]) - 1, NULL)
,FORMAT_STRING = "#,##0.00%"
`;

const yeartoYearselectBlock = `
    [Measures].[План сегмент Выручка без НДС]
    ,[Measures].[Накопительная выручка за месяц без НДС]
    ,[Measures].[Выполнение план сегмент Выручка без НДС]
    ,[Measures].[Доля Выручки без НДС]
    ,[Прогресс Накопительная выручка за месяц без НДС пгп]
    ,[Прогресс План сегмент Выручка без НДС пгп]
    
    ,[Measures].[План сегмент Маржа без НДС]
    ,[Measures].[Накопительная маржа за месяц без ндс]
    ,[Measures].[Выполнение план сегмент Маржа без НДС]
    ,[Measures].[Отклонение выполнение по ВМ от выполнение по ТО]
    ,[Прогресс Накопительная маржа за месяц без ндс пгп]
    ,[Прогресс План сегмент Маржа без НДС пгп]
    
    ,[Measures].[План сегмент уровень маржи]
    ,[Measures].[Уровень маржи без НДС]
    ,[Measures].[Отклонение УВМ от плана]
    ,[Прогресс Уровень маржи без НДС пгп]
    ,[Прогресс План сегмент уровень маржи пгп]
    
    ,[Measures].[План Количество клиентов ]
    ,[Measures].[Кол клиентов Сумма по сегментам накопительно]
    ,[Measures].[Выполнение плана Кол клиентов]
    ,[Прогресс Кол клиентов Сумма по сегментам накопительно пгп]
    ,[Прогресс План Количество клиентов пгп]
    
    ,[Measures].[План сегмент Количество артикулов ]
    ,[Measures].[Кол артикулов накопительно]
    ,[Measures].[Выполнение плана Кол артикулов]
    ,[Прогресс Кол артикулов накопительно пгп]
    ,[Прогресс План сегмент Количество артикулов пгп]

    ,[Measures].[План сегмент Стоимость одного артикула ]
    ,[Measures].[Ср. ст-ть артикула ]
    ,[Measures].[Отклонение от плана Ср. ст-ть артикула]
    ,[Прогресс Ср. ст-ть артикула пгп]
    ,[Прогресс План сегмент Стоимость одного артикула пгп]    
    
    ,[Measures].[План Кол артикулов на 1 клиента]
    ,[Measures].[Кол артикулов на 1 сум клиента]
    ,[Measures].[Отклонение от плана Кол артикулов на 1 клиента]
    ,[Прогресс Кол артикулов на 1 сум клиента пгп]
    ,[Прогресс План Кол артикулов на 1 клиента пгп]
`;



module.exports = router;