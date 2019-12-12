const express = require('express');
const router = express.Router();
const olap = require('../olap/olap-helper');
const helper = require('./router-helper');
const CEP = require ('./ColumnExtraProperty').ColumnExtraProperty;
const REP = require ('./ColumnExtraProperty').RowExtraProperty;

router.post("/actuality", function(req , res) {
    const query = `
        SELECT [Measures].[Актуальность] ON 0,
        NON EMPTY [ПодразделенияМин] ON 1
        FROM [Чеки актуальность]
    `;

    helper.handleMdxQueryWithAuth(query, req, res);
});

router.post("/sales-cone", function(req , res) {
    console.log(req.body);
    if (!req.body || req.body.size > 0) {
        res.json("no body");
        return;
    }

    // res.statusCode = 401;
    // res.json("");
    // return;

    let query = `
        WITH MEMBER [КУУП] AS
        IIF([Подразделения].[Подразделение].CurrentMember is [Подразделения].[Подразделение].[All],
         ([Measures].[КУП], [Подразделения].[Подразделение].[All]),
         [Measures].[КУП])
         member [Подразделения].[Подразделение].[Код] as
         IIF(([Подразделения].[Подразделение].[All], [КУУП]) >= 0,  [Товары].[Товар ключ].CurrentMember.Properties("Key", TYPED), NULL)
         member [Подразделения].[Подразделение].[Активный] as
         IIF(([Подразделения].[Подразделение].[All], [КУУП]) >= 0,  (EXISTING([Товары].[Активный].[Активный])).Item(0).Properties("Key", TYPED), NULL)
         member [Подразделения].[Подразделение].[Новый] as
         IIF(([Подразделения].[Подразделение].[All], [КУУП]) >= 0,  (EXISTING([Товары].[Новый].[Новый])).Item(0).Properties("Key", TYPED), NULL)
        
         member [Подразделения].[Подразделение].[КУП] as
         [Подразделения].[Подразделение].[All]
        
        SELECT NON EMPTY ({[Подразделения].[Подразделение].[Активный], [Подразделения].[Подразделение].[Новый],  [Код], [Подразделения].[Подразделение].[КУП], order([Подразделения].[Подразделение].[Подразделение].AllMembers,  [Подразделения].[Подразделение].Properties( "Key" ), BASC)}) ON 0,
        ORDER(NONEMPTY([Товары].[Товар ключ].[Товар ключ]), [Подразделения].[Подразделение].[КУП], DESC)   ON 1
		FROM (
		SELECT (%cond%) ON 0
        FROM [Чеки]
		)
        WHERE ([Measures].[КУП])
        `;

    //only full weeks
    if (req.body.periodFilter) {
        req.body.periodFilter.date = helper.moveToNearestFullWeekStart(req.body.periodFilter.date);
    }
    let condString = helper.getMDXConditionString(req.body);
//    query = query.replace(/\)\s*$/, ', ' + condString+ ')');
    query = query.replace('%cond%', condString);

    const options = {columns:
            [
                new CEP({colNumber: 0, sign: 'item'}),
                new CEP({colNumber: 1, sign: 'active', type: 'number'}),
                new CEP({colNumber: 2, sign: 'new', type: 'number'}),
                new CEP({colNumber: 3, sign: 'item_code'}),
                new CEP({colNumber: 4, sign: 'total'})
            ]
    };
    helper.handleMdxQueryWithAuth({query: query, options: options}, req, res);
});


router.post("/sales-cone/dynamic-cup", function(req , res) {
    console.log(req.body);


    let query = `
        WITH MEMBER [КУУП] AS
        IIF([Подразделения].[Подразделение].CurrentMember is [Подразделения].[Подразделение].[All],
         ([Measures].[КУП], [Подразделения].[Подразделение].[All]),
         [Measures].[КУП])
        
          member [Подразделения].[Подразделение].[Общий КУП] as
         [Подразделения].[Подразделение].[All]
        
        SELECT [Даты].[гост Недели].[гост Неделя] ON 0
        ,NON EMPTY {[Подразделения].[Подразделение].[Общий КУП], [Подразделения].[Подразделение].[Подразделение].Members} ON 1
        FROM
        (
        SELECT ([Подразделения].[Подразделение].&[0]
        ) ON 0 FROM [Чеки] )
        WHERE [КУУП]
    `;

    //only full weeks
    if (req.body.periodFilter) {
        req.body.periodFilter.date = helper.moveToNearestFullWeekStart(req.body.periodFilter.date);
    }
    //todo more unique
    let condString = helper.getMDXConditionString(req.body);
    query = query.replace(/\(\s*select\s*\(((.|\s)+)\)\s*on 0/igm, '(select (' + condString + ') on 0'); //todo remove reaptings - replace only group 1
    //console.log(query);
    olap.getDataset(query)
        .then((result)=>{
            res.json(olap.dataset2Tableset(result.data))})
        .catch((err)=>res.send(err.exception && err.exception.message)); //todo move to common error handler, without showing details in repconse, only in log file
});


router.post("/sales-cone/cell-property", function(req , res) {
    console.log(req.body);

    let query = `
        WITH 
        MEMBER [Остаток] AS [Measures].[Остаток количество], FORMAT_STRING = "#,##0.00"
        MEMBER [Цена продажи] AS [Measures].[Средняя цена]
        MEMBER [Сумма продажи] AS [Measures].[Сумма]
        MEMBER [Плановый УВМ] AS [План сегмент Доля Маржи без НДС]
        MEMBER [Оборачиваемость] AS (Ancestor(TAIL(EXISTING([Даты].[Месяцы].[Дата]), 1).item(0).PrevMember, 1).item(0),   [Measures].[Коэф оборачиваемости]), FORMAT_STRING = "#,##0.00"
        MEMBER [Сумма списания] AS-1*([Виды операций].[ВидОперации].&[Списание], [Measures].[Оборот сумма без НДС]), FORMAT_STRING = "#,##0.00"
        MEMBER [Доля списания к ТО] AS [Сумма списания]/[Сумма без НДс], FORMAT_STRING = "#,##0.00%"
        MEMBER [Количество в день] AS [Measures].[Количество товара]/(EXISTING([Даты].[Дата].[Дата])).Count, FORMAT_STRING = "#,##0.00"
                
        SELECT {[Цена продажи], [Сумма продажи], [Маржа %], [Остаток], [Плановый УВМ], [Оборачиваемость], [Сумма списания], [Доля списания к ТО], [Количество в день]} ON 0
        ,[Товары].[Товары] ON 1
        
        FROM [Чеки]
    `;

    //todo more unique
    let condString = helper.getMDXConditionString(req.body);
    query = query + ` where (${condString})`;

    olap.getDataset(query)
        .then((result)=>{
            res.json(olap.dataset2Tableset(result.data))})
        .catch((err)=>res.send(err)); //todo move to common error handler, without showing details in repconse, only in log file
});

router.post("/dim", function(req , res) {

    olap.getDimensionAsTreeWithCash(req.body)
        .then((result)=>{
            res.json(result)})
        .catch((err)=>res.json(err));
});




//todo move from here
const dailyRevenueFieldPrefix =
    `
    WITH MEMBER [День недели] as 
    IIF([Measures].[План Выручка без НДС]> 0 OR [Measures].[Сумма] > 0, [Даты].[Дата].CurrentMember.PROPERTIES("День недели"), NULL)
    MEMBER [Кол артикулов] as ([Товары].[Прочий].&[0], Measures.[Количество товара]) 
    MEMBER [Кол клиентов] as ([Товары].[Прочий].&[0], Measures.[Кол чеков]) 
    MEMBER [Остаток кол артикулов] as [Остаток количество]
    MEMBER [Количество оплат сертификатам, шт] as [Кол сертификатов]  
    MEMBER [Сумма выручки с продаж, оплата сертификатам, руб.] as [Сумма сертификатов]  
    MEMBER [Выручка с продаж с НДС без Прочее] as [Выручка с продаж без Прочее]  
    MEMBER [Средний чек] as [Средняя сумма]  
    MEMBER [tmpCol] AS IIF([Measures].[Сумма] > 0, 1, NULL) 
    SELECT {
    %tempCol%
    [Measures].[День недели], [Кол комментарий]
    ,[Measures].[План Выручка без НДС], [Measures].[Накопительная выручка за месяц без НДС],[Measures].[Выполнение плана выручки без НДС], [Measures].[Выручка с продаж с НДС без Прочее],[Measures].[Прочее, Накопительная выручка за месяц без НДС],[Measures].[План Маржа без НДС],[Measures].[Выполнение плана маржи без НДС],[Measures].[Накопительная маржа за месяц без ндс],[Measures].[Маржа без НДС], [Measures].[Маржа без НДС %], [Measures].[Кол клиентов]
    ,[Measures].[Средний чек],[Measures].[Кол артикулов],[Measures].[Кол артикулов на 1 клиента], [Measures].[Остаток кол артикулов],[Measures].[Остаток сумма без НДС],[Measures].[Коэф оборачиваемости]
    ,[Measures].[Количество SCU сток],[Measures].[Количество SCU транзит],[Measures].[Сумма закупки сток],[Measures].[Сумма закупки транзит],[Measures].[Доля закупки сток в закупке],[Measures].[Доля закупки транзит в закупке],[Measures].[Сумма закупки],[Measures].[Сумма безнал],[Measures].[Кол клиентов по безнал],[Measures].[Средний чек по безнал],[Measures].[Доля продаж по безнал к общим продажам],[Measures].[Доля клиентов по безнал к общему количеству]
    ,[Measures].[Накопительно безнал за месяц]
    ,[Measures].[Сумма продаж в ночное время],[Measures].[Кол клиентов в ночное время],[Measures].[Средний чек по ночным продажам],[Measures].[Доля продаж в ночное время к общим продажам]
    ,[Measures].[Количество оплат сертификатам, шт],[Measures].[Сумма выручки с продаж, оплата сертификатам, руб.]
    ,[Сумма Спасибо от Сбербанка], [Средняя сумма чека со Спасибо от Сбербанка], [Доля оплат бонусами СБ в ТО с НДС], [Начислено Спасибо от Сбербанка], [Средняя сумма чека с Начислено Спасибо от Сбербанка], [Measures].[Доля начислено бонусами СБ в ТО с НДС]
    ,[Комментарии к работе магазина]
    } ON COLUMNS`;

router.post("/daily-revenue", function(req , res) {
    console.log('body: ', req.body);
    if (!req.body || req.body.size > 0) {
        res.json("no body");
        return;
    }

    const shopSelectString = req.body.withShopColumn ? ', [Подразделения].[Подразделение].Members' : '';

    let query = `
        ${dailyRevenueFieldPrefix} 
        , NON EMPTY ([Даты].[Дата].Members ${shopSelectString}) ON ROWS
        FROM (SELECT %not_full_month_cond% ON 0
            FROM [Чеки] 
        )
        WHERE (%cond%, [Даты].[Это полный день].&[Да]) 
        `;

    //pre cond handling
    let notFullMonthCond = '{[Даты].[Дата].[All]}';
    if (req.body && req.body.periodFilter) {
        if (helper.isFullMonth(req.body.periodFilter.date, req.body.periodFilter.endDate)) {
            req.body.filterArray.push(
                [
                    '[Даты].[Месяцы]',
                    [olap.dateToMDX(req.body.periodFilter.date)],
                ],
            );
        }
        else {
            notFullMonthCond = helper.getMDXConditionString({periodFilter: req.body.periodFilter});
        }
        req.body.periodFilter = null;
    }

    //todo do refactoring this
    query = query.replace('%tempCol%', req.body.withShopColumn ? '' : '[Measures].[tmpCol],');

    query = query.replace('%not_full_month_cond%', notFullMonthCond);

    let condString = helper.getMDXConditionString(req.body);
    condString = condString.replace(/\[Подразделения\]\.\[Подразделение\]/g, '[Подразделения].[Подформаты]');
//    query = query.replace(/\)\s*$/, ', ' + condString+ ')');
    query = query.replace('%cond%', condString).replace('(,', '('); //todo indeed of the second replace it needs to think else

    helper.handleMdxQueryWithAuth(query, req, res);
});


router.post("/daily-revenue-day-shop", function(req , res) {
    console.log(req.body);
    if (!req.body || req.body.size > 0) {
        res.json("no body");
        return;
    }

    let query = `
        ${dailyRevenueFieldPrefix} 
        , NON EMPTY ([Подразделения].[Подразделение].[Подразделение], [Подразделения].[Подформат].[Подформат])  ON ROWS  
        FROM [Чеки] 
        WHERE (%cond%) 
        `;

    query = query.replace('%tempCol%', '');

    let condString = helper.getMDXConditionString(req.body);
    condString = condString.replace(/\[Подразделения\]\.\[Подразделение\]/g, '[Подразделения].[Подформаты]');
//    query = query.replace(/\)\s*$/, ', ' + condString+ ')');
    query = query.replace('%cond%', condString);

    helper.handleMdxQueryWithAuth(query, req, res);
});


module.exports = router;