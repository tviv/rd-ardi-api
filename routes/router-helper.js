const olap = require('../olap/olap-helper');

module.exports = {
    getMDXConditionString: function (inputObject) {
        let condString = '';

        if (!inputObject) return;

        if (inputObject.shopFilter) {
            condString += '{' + inputObject.shopFilter + '},';
        }
        if (inputObject.goodFilter) {
            condString += '{' + inputObject.goodFilter + '},';
        }

        if (inputObject.dateFilter) {
            let date = olap.dateToMDX(inputObject.dateFilter, '[Даты].[Дата]');
            console.log('date is converted to:', date);

            condString +=  '{' + date + '},';
        }

        if (inputObject.periodFilter) {
            let dates = olap.getMDXPeriod(inputObject.periodFilter.date, inputObject.periodFilter.days, '[Даты].[Дата]');
            console.log('period is converted to:', dates.periodString);

            condString +=  '{' + dates.periodString + '},';
        }

        condString = condString.replace(/,$/, '');
        
        return condString
    }
}