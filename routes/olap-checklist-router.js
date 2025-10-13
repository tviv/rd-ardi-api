const express = require('express');
const router = express.Router();
const olap = require('../olap/olap-helper');
const helper = require('./router-helper');

const dailyRevenueFieldPrefix =
    `
    WITH MEMBER [День недели] as 
    IIF(ISEMPTY([Measures].[Факт Балл]), NULL, [Даты].[Дата].CurrentMember.PROPERTIES("День недели"))
    MEMBER [Соответствие ] AS
	IIF(ISEMPTY([Макс Балл]) AND ISEMPTY([Measures].[Факт Балл]), NULL, CASE 
	WHEN [Соответствие] = 1 THEN "Соответствует"
	WHEN [Соответствие] = 0 THEN "Не соответствует" 
	ELSE "Соответствует условно"
	END)
    MEMBER [tmpCol] AS IIF(ISEMPTY([Measures].[Факт Балл]), NULL, 1) 
    SELECT {
    %tempCol%
    [Measures].[День недели], [Кол нарушений], [Макс Балл], [Факт Балл], [Соответствие ], [Кол чеклистов] 
    } ON COLUMNS`;
     
router.post("/", function(req , res) {
    console.log('body: ', req.body);
    if (!req.body || req.body.size > 0) {
        res.json("no body");
        return;
    }

    const mainSelect = req.query.withDetails ? '[Даты].[Дата].[Дата], [Подразделения].[Подразделение].[Подразделение], [Чеклист Пункты].[Чеклист Пункты].[Level 04], Filter([Чеклист Нарушения].[Чеклист Нарушение].[Чеклист Нарушение], [Кол нарушений] > 0)' : '[Даты].[Дата].Members';
    

    const shopSelectString = req.body.withShopColumn ? ', [Подразделения].[Подразделение].Members' : '';

    let query = `
        ${dailyRevenueFieldPrefix} 
        , NON EMPTY (${mainSelect} ${shopSelectString}) ON ROWS
        FROM (SELECT %not_full_month_cond% ON 0
            FROM [Чеклисты] 
        )
        WHERE (%cond%, [Даты].[Это полный день].&[Да]) 
        `;

    //pre cond handling
    let notFullMonthCond = req.query.withDetails ? req.body.data :'{[Даты].[Дата].[All]}';
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

    query = query.replace('%not_full_month_cond%', notFullMonthCond);

    let condString = helper.getMDXConditionString(req.body);
    condString = condString.replace(/\[Подразделения\]\.\[Подразделение\]/g, '[Подразделения].[Подформаты]');
//    query = query.replace(/\)\s*$/, ', ' + condString+ ')');
    query = query.replace('%cond%', condString).replace('(,', '('); //todo indeed of the second replace it needs to think else

    helper.handleMdxQueryWithAuth(query, req, res);
});


router.post("/day-shop", function(req , res) {
    console.log(req.body);
    if (!req.body || req.body.size > 0) {
        res.json("no body");
        return;
    }

    let query = `
        ${dailyRevenueFieldPrefix} 
        , NON EMPTY ([Подразделения].[Подразделение].[Подразделение], [Подразделения].[Подформат].[Подформат])  ON ROWS  
        FROM [Чеклисты] 
        WHERE (%cond%, [Даты].[Это полный день].&[Да]) 
        `;

    query = query.replace('%tempCol%', '');


    //todo duplicating
    if (req.body && req.body.periodFilter && helper.isFullMonth(req.body.periodFilter.date, req.body.periodFilter.endDate)) {
        req.body.filterArray.push(
            [
                '[Даты].[Месяцы]',
                [olap.dateToMDX(req.body.periodFilter.date)],
            ],
        );
        req.body.periodFilter = undefined;
    }
    let condString = helper.getMDXConditionString(req.body);

    condString = condString.replace(/\[Подразделения\]\.\[Подразделение\]/g, '[Подразделения].[Подформаты]');
//    query = query.replace(/\)\s*$/, ', ' + condString+ ')');
    query = query.replace('%cond%', condString);

    helper.handleMdxQueryWithAuth(query, req, res);
});




module.exports = router;