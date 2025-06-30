const express = require('express');
const router = express.Router();
const olap = require('../olap/olap-helper');
const helper = require('./router-helper');

const dailyRevenueFieldPrefix =
    `
    WITH MEMBER [День недели] as 
    IIF([Measures].[Факт Балл]> 0, [Даты].[Дата].CurrentMember.PROPERTIES("День недели"), NULL)
    MEMBER [Соответствие ] AS
	IIF([Макс Балл] > 0 OR [Measures].[Факт Балл] > 0, CASE 
	WHEN [Соответствие] = 1 THEN "Соответствует"
	WHEN [Соответствие] = 0 THEN "Не соответствует" 
	ELSE "Соответствует условно"
	END,
	NULL)
    MEMBER [tmpCol] AS IIF([Measures].[Факт Балл] > 0, 1, NULL) 
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

    const shopSelectString = req.body.withShopColumn ? ', [Подразделения].[Подразделение].Members' : '';

    let query = `
        ${dailyRevenueFieldPrefix} 
        , NON EMPTY ([Даты].[Дата].Members ${shopSelectString}) ON ROWS
        FROM (SELECT %not_full_month_cond% ON 0
            FROM [Чеклисты] 
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