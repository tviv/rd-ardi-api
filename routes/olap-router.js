const express = require('express');
const router = express.Router();
const olap = require('../olap/olap-helper');


router.post("/sales-cone", function(req , res) {
    console.log(req.body);
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
        IIF([Подразделения].[Организации].CurrentMember is [Подразделения].[Организации].[All],
         ([Measures].[КУП], [Подразделения].[Организации].[All]),
         [Measures].[КУП])
         member [Подразделения].[Организации].[Код] as
         IIF(([Подразделения].[Организации].[All], [КУУП]) > 0,  [Товары].[Товары].Currentmember.Properties("Код товара"), NULL)
        
         member [Подразделения].[Организации].[КУП] as
         [Подразделения].[Организации].[All]
        
        SELECT NON EMPTY ({[Код], [Подразделения].[Организации].[КУП] , order([Подразделения].[Организации].[Подразделение].AllMembers,  [Подразделения].[Подразделение].Properties( "Key" ), BASC)}) ON 0,
        NON EMPTY [Товары].[Товар].[Товар].Members DIMENSION PROPERTIES PARENT_UNIQUE_NAME,HIERARCHY_UNIQUE_NAME,[Товары].[Товар].[Товар].[Код товара] ON 1
        FROM [Чеки]
        WHERE ([Measures].[КУП])
        `;

    //todo more unique
    let regLastPar = /\)\s*$/;
    if (req.body && req.body.shopFilter) {
        query = query.replace(regLastPar, ', {' + req.body.shopFilter + '})');
    }
    if (req.body && req.body.segmentFilter) {
        query = query.replace(regLastPar, ', {' + req.body.segmentFilter + '})');
    }

    if (req.body && req.body.dateFilter) {
        let dates = olap.getMDXPeriodFromDate(req.body.dateFilter, -6, '[Даты].[Дата]');
        console.log('date is converted to:', dates.periodString);

        query = query.replace(regLastPar, ', {' + dates.periodString + '})');
    }

    if (req.body && req.body.dateFilter) {
        let date = olap.dateToMDX(req.body.dateFilter, '[Даты].[Дата]');
        console.log('date is converted to:', date);

        query = query.replace(regLastPar, ', {' + date + '})');
    }

    if (req.body && req.body.periodFilter) {
        let dates = olap.getMDXPeriod(req.body.periodFilter.toDate, req.body.periodFilter.days, '[Даты].[Дата]');
        console.log('period is converted to:', dates.periodString);

        query = query.replace(regLastPar, ', {' + dates.periodString + '})');
    }


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
        
        SELECT [Даты].[Дата].[Дата].Members ON 0
        ,NON EMPTY {[Подразделения].[Подразделение].[Общий КУП], [Подразделения].[Подразделение].[Подразделение].Members} ON 1
        FROM
        (
        SELECT ([Подразделения].[Подразделение].&[0]
        ) ON 0 FROM [Чеки] )
        WHERE [КУУП]
    `;

    //todo more unique
    let condString = '';

    if (req.body && req.body.shopFilter) {
        condString += '{' + req.body.shopFilter + '},';
    }
    if (req.body && req.body.goodFilter) {
        condString += '{' + req.body.goodFilter + '},';
    }

    if (req.body && req.body.dateFilter) {
        let date = olap.dateToMDX(req.body.dateFilter, '[Даты].[Дата]');
        console.log('date is converted to:', date);

        condString +=  '{' + dates.periodString + '},';
    }

    if (req.body && req.body.periodFilter) {
        let dates = olap.getMDXPeriod(req.body.periodFilter.toDate, req.body.periodFilter.days, '[Даты].[Дата]');
        console.log('period is converted to:', dates.periodString);

        condString +=  '{' + dates.periodString + '},';
    }

    condString = condString.replace(/,$/, '');
    query = query.replace(/\(\s*select\s*\(((.|\s)+)\)\s*on 0/igm, '(select (' + condString + ') on 0'); //todo remove reaptings - replace only group 1

    olap.getDataset(query)
        .then((result)=>{
            res.json(olap.dataset2Tableset(result.data))})
        .catch((err)=>res.send(err.exception.message)); //todo move to common error handler, without showing details in repconse, only in log file
});



router.post("/dim", function(req , res) {
    var query = "select NULL ON 0,\n" +
        req.body.dim + ".AllMembers ON 1\n" + //todo on query params
        "from [Чеки]";

    olap.getDataset(query)
        .then((result)=>{
            res.json(olap.dataset2Tableset(result.data))})
        .catch((err)=>res.json(err));
});

module.exports = router;