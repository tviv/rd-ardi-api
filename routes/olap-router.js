const express = require('express');
const router = express.Router();
const olap = require('../olap/olap-helper');
const helper = require('./router-helper');



router.post("/sales-cone", function(req , res) {
    console.log(req.body);
    if (!req.body || req.body.size > 0) {
        res.json("no body");
        return;
    }

    // res.statusCode = 401;
    // res.json("");
    // return;

    var query = "\t\t\tSELECT {[Measures].[Актуальность2], [Measures].[Чеки актуальность]} ON 0\n" +
        "\t\t\t,[ПодразделенияМин] ON 1\n" +
        "\t\t\tFROM [Чеки актуальность] where [Подразделения].[Организации].[Организация].&[31] --where [Подразделения].[Подразделения].&[227]";

    query = "SELECT NON EMPTY [Подразделения].[Подразделение].Members  ON COLUMNS , \n" +
        "NON EMPTY [Товары].[Товар].[Товар].AllMembers DIMENSION PROPERTIES [Товары].[Товар].[Товар].[Код товара] ON ROWS  \n" +
        "FROM (SELECT ({[Даты чека].[Дата].&[2018-02-06T00:00:00]:[Даты чека].[Дата].&[2018-05-27T00:00:00]}) ON COLUMNS  FROM [Чеки]) \n" +
        "WHERE ([Measures].[КИП]) ";

    // query = "SELECT NON EMPTY ([Подразделения].[Подразделение].AllMembers, {[Measures].[КИП], [Сумма]}) ON 0,\n" +
    //     "NON EMPTY [Товары].[Товар].[Товар].Members DIMENSION PROPERTIES PARENT_UNIQUE_NAME,HIERARCHY_UNIQUE_NAME,[Товары].[Товар].[Товар].[Код товара] ON 1\n" +
    //     "FROM [Чеки]" +
    //     "WHERE ([Даты].[Дата].&[2018-02-06T00:00:00], [Товары].[Товары].&[171467])";

    query = `
        WITH MEMBER [КУУП] AS
        IIF([Подразделения].[Подразделение].CurrentMember is [Подразделения].[Подразделение].[All],
         ([Measures].[КУП], [Подразделения].[Подразделение].[All]),
         [Measures].[КУП])
         member [Подразделения].[Подразделение].[Код] as
         IIF(([Подразделения].[Подразделение].[All], [КУУП]) >= 0,  [Товары].[Товар ключ].Currentmember.Properties("Код товара"), NULL)
         member [Подразделения].[Подразделение].[Активный] as
         IIF(([Подразделения].[Подразделение].[All], [КУУП]) >= 0,  [Товары].[Товар ключ].Currentmember.Properties("Активный"), NULL)
        
         member [Подразделения].[Подразделение].[КУП] as
         [Подразделения].[Подразделение].[All]
        
        SELECT NON EMPTY ({[Подразделения].[Подразделение].[Активный], [Код], [Подразделения].[Подразделение].[КУП], order([Подразделения].[Подразделение].[Подразделение].AllMembers,  [Подразделения].[Подразделение].Properties( "Key" ), BASC)}) ON 0,
        ORDER(NONEMPTY([Товары].[Товар ключ].[Товар ключ]), [Подразделения].[Подразделение].[КУП], DESC)   ON 1
		FROM (
		SELECT (%cond%) ON 0
        FROM [Чеки]
		)
        WHERE ([Measures].[КУП])
        `;

    let condString = helper.getMDXConditionString(req.body);
//    query = query.replace(/\)\s*$/, ', ' + condString+ ')');
    query = query.replace('%cond%', condString);

    helper.handleMdxQueryWithAuth(query, req, res);
});


router.post("/sales-cone/dynamic-cup", function(req , res) {
    console.log(req.body);


    query = `
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

    query = `
        WITH 
        MEMBER [Остаток] AS [Measures].[Остаток количество]
        MEMBER [Цена продажи] AS [Measures].[Средняя цена]
        MEMBER [Сумма продажи] AS [Measures].[Сумма]
        
        SELECT {[Цена продажи], [Сумма продажи], [Маржа %], [Остаток]} ON 0
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
const dailyRevenueFields =
    `{
	[Measures].[План Выручка без НДС], [Measures].[Накопительная выручка за месяц без НДС],[Measures].[Выполнение плана выручки без НДС], [Measures].[Выручка с продаж без Прочее],[Measures].[Прочее, Накопительная выручка за месяц без НДС],[Measures].[План Маржа без НДС],[Measures].[Выполнение плана маржи без НДС],[Measures].[Накопительная маржа за месяц без ндс],[Measures].[Маржа без НДС], [Measures].[Маржа %], [Measures].[Кол клиентов]
	,[Measures].[Средняя сумма],[Measures].[Кол артикулов],[Measures].[Количество на чек],[Measures].[Остаток количество],[Measures].[Остаток сумма без НДС],[Measures].[Коэф оборачиваемости]
    ,[Measures].[Количество SCU сток],[Measures].[Количество SCU транзит],[Measures].[Сумма закупки сток],[Measures].[Сумма закупки транзит],[Measures].[Доля закупки сток в закупке],[Measures].[Доля закупки транзит в закупке],[Measures].[Сумма закупки],[Measures].[Сумма безнал],[Measures].[Кол клиентов по безнал],[Measures].[Средний чек по безнал],[Measures].[Доля продаж по безнал к общим продажам],[Measures].[Доля клиентов по безнал к общему количеству]
    --,[Measures].[Накопительно безнал за месяц]
    ,[Measures].[Сумма продаж в ночное время],[Measures].[Кол клиентов в ночное время],[Measures].[Средний чек по ночным продажам],[Measures].[Доля продаж в ночное время к общим продажам]
    ,[Measures].[Кол сертификатов],[Measures].[Сумма сертификатов]
    ,[Сумма Спасибо от Сбербанка], [Средняя сумма чека со Спасибо от Сбербанка], [Доля оплат бонусами СБ в ТО с НДС], [Начислено Спасибо от Сбербанка], [Средняя сумма чека с Начислено Спасибо от Сбербанка], [Measures].[Доля начислено бонусами СБ в ТО с НДС]
    }`;
router.post("/daily-revenue", function(req , res) {
    console.log(req.body);
    if (!req.body || req.body.size > 0) {
        res.json("no body");
        return;
    }

    let query = `
        SELECT ${dailyRevenueFields} ON COLUMNS 
        , NON EMPTY [Даты].[Дата].Members ON ROWS  
        FROM [Чеки] 
        WHERE (%cond%, [Даты].[Это полный день].&[Да]) 
        `;

    let condString = helper.getMDXConditionString(req.body);
//    query = query.replace(/\)\s*$/, ', ' + condString+ ')');
    query = query.replace('%cond%', condString);

    helper.handleMdxQueryWithAuth(query, req, res);
});


router.post("/daily-revenue-day-shop", function(req , res) {
    console.log(req.body);
    if (!req.body || req.body.size > 0) {
        res.json("no body");
        return;
    }

    let query = `
        SELECT ${dailyRevenueFields} ON COLUMNS 
        , NON EMPTY [Подразделения].[Подразделение].[Подразделение] ON ROWS  
        FROM [Чеки] 
        WHERE (%cond%) 
        `;

    let condString = helper.getMDXConditionString(req.body);
    condString = condString.replace(/\[Подразделения\]\.\[Подразделение\]/g, '[Подразделения].[Подформаты].[Подразделение]');
//    query = query.replace(/\)\s*$/, ', ' + condString+ ')');
    query = query.replace('%cond%', condString);

    helper.handleMdxQueryWithAuth(query, req, res);
});


module.exports = router;