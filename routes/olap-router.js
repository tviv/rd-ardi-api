const express = require('express');
const router = express.Router();
const olap = require('../olap/olap-helper');
const helper = require('./router-helper');


router.post("/sales-cone", function(req , res) {
    console.log(req.body);
    if (!req.body || req.body.size > 0) {
        res.json("no body")
        return;
    }

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
         IIF(([Подразделения].[Подразделение].[All], [КУУП]) > 0,  [Товары].[Товар].Currentmember.Properties("Код товара"), NULL)
         member [Подразделения].[Подразделение].[Активный] as
         IIF(([Подразделения].[Подразделение].[All], [КУУП]) > 0,  [Товары].[Товар].Currentmember.Properties("Активный"), NULL)
        
         member [Подразделения].[Подразделение].[КУП] as
         [Подразделения].[Подразделение].[All]
        
        SELECT NON EMPTY ({[Подразделения].[Подразделение].[Активный], [Код], [Подразделения].[Подразделение].[КУП], order([Подразделения].[Подразделение].[Подразделение].AllMembers,  [Подразделения].[Подразделение].Properties( "Key" ), BASC)}) ON 0,
        ORDER(NONEMPTY([Товары].[Товар].[Товар]), [Measures].[КУП], DESC)   ON 1
		FROM (
		SELECT (%cond%) ON 0
        FROM [Чеки]
		)
        WHERE ([Measures].[КУП])
        `;

    let condString = helper.getMDXConditionString(req.body);
//    query = query.replace(/\)\s*$/, ', ' + condString+ ')');
    query = query.replace('%cond%', condString);

    olap.getDataset(query)
        .then((result)=>{
            res.json(olap.dataset2Tableset(result.data))})
        .catch((err)=>res.json(err));
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
        .catch((err)=>res.send(err.exception.message)); //todo move to common error handler, without showing details in repconse, only in log file
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
    let query = "select NULL ON 0,\n" +
        req.body.dim + ".AllMembers ON 1\n" + //todo on query params
        "from [Чеки]";

    olap.getDataset(query)
        .then((result)=>{
            res.json(olap.dataset2Tableset(result.data))})
        .catch((err)=>res.json(err));
});



router.post("/dim2", function(req , res) {
    //temp
    if (req.body.hierarchyName == "[Товары].[Товары]") {
        if (this.cash1) {
            res.json(this.cash1);
            return;
        }
    }
    if (req.body.hierarchyName == "[Товары].[Производитель]") {
        if (this.cash2) {
            res.json(this.cash2);
            return;
        }
    }
    if (req.body.hierarchyName == "[Товары].[Поставщик]") {
        if (this.cash3) {
            res.json(this.cash3);
            return;
        }
    }


    olap.getDimensionAsTree(req.body)
        .then((result)=>{
            console.log(`get dimension ${req.body.hierarchyName}, count:${result.data.length}`)
            if (req.body.hierarchyName == "[Товары].[Товары]") this.cash1 = result.data; //temp
            if (req.body.hierarchyName == "[Товары].[Производитель]") this.cash2 = result.data; //temp
            if (req.body.hierarchyName == "[Товары].[Поставщик]") this.cash3 = result.data; //temp
            res.json(result.data)})
        .catch((err)=>res.json(err));
});



module.exports = router;