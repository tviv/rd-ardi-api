const express = require('express');
const router = express.Router();
const olap = require('../olap/olap');


//POST API
router.post("/sales-cone", function(req , res) {
    console.log(req.body);
    var query = "\t\t\tSELECT {[Measures].[Актуальность2], [Measures].[Чеки актуальность]} ON 0\n" +
        "\t\t\t,[ПодразделенияМин] ON 1\n" +
        "\t\t\tFROM [Чеки актуальность] where [Подразделения].[Организации].[Организация].&[31] --where [Подразделения].[Подразделения].&[227]";

    query = "SELECT NON EMPTY [Подразделения].[Подразделение].Members  ON COLUMNS , \n" +
        "NON EMPTY [Товары].[Товар].[Товар].AllMembers DIMENSION PROPERTIES [Товары].[Товар].[Товар].[Код товара] ON ROWS  \n" +
        "FROM (SELECT ({[Даты].[Дата].&[2018-02-06T00:00:00]:[Даты].[Дата].&[2018-05-27T00:00:00]}) ON COLUMNS  FROM [Чеки]) \n" +
        "WHERE ([Measures].[КИП]) ";

    // query = "SELECT NON EMPTY ([Подразделения].[Подразделение].AllMembers, {[Measures].[КИП], [Сумма]}) ON 0,\n" +
    //     "NON EMPTY [Товары].[Товар].[Товар].Members DIMENSION PROPERTIES PARENT_UNIQUE_NAME,HIERARCHY_UNIQUE_NAME,[Товары].[Товар].[Товар].[Код товара] ON 1\n" +
    //     "FROM [Чеки]" +
    //     "WHERE ([Даты].[Дата].&[2018-02-06T00:00:00], [Товары].[Товары].&[171467])";

    query = "SELECT NON EMPTY ({[Подразделения].[Организации].[All],[Подразделения].[Организации].[Подразделение].AllMembers}) ON 0,\n" +
        "NON EMPTY [Товары].[Товар].[Товар].Members DIMENSION PROPERTIES PARENT_UNIQUE_NAME,HIERARCHY_UNIQUE_NAME,[Товары].[Товар].[Товар].[Код товара] ON 1\n" +
        "FROM [Чеки]\n" +
        "WHERE ([Measures].[КИП])";

    //todo more unique
    if (req.body && req.body.shopFilter) {
        query = query.replace(/\)$/, ', {' + req.body.shopFilter + '})');
    }
    if (req.body && req.body.segmentFilter) {
        query = query.replace(/\)$/, ', {' + req.body.segmentFilter + '})');
    }

    if (req.body && req.body.dateFilter) {
        let dates = olap.getMDXPeriodFromDate(req.body.dateFilter, -7, '[Даты].[Дата]');
        console.log('date is converted to:', dates.periodString);

        query = query.replace(/\)$/, ', {' + dates.periodString + '})');
    }

    olap.getDataset(query)
        .then((result)=>{
            res.json(olap.dataset2Tableset(result.data))})
        .catch((err)=>res.json(err));
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