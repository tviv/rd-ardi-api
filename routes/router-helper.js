const moment = require('moment');
const olap = require('../olap/olap-helper');
const auth = require('../utils/auth');

const rh = {
    getMDXConditionString: function (inputObject) {
        let condString = '';

        if (!inputObject) return;

        if (inputObject.filterArray && inputObject.filterArray.length > 0) {
            condString += olap.convertArrValuesToMDXTupleString(inputObject.filterArray) + ',';
        } else {

            if (inputObject.shopFilter) {
                condString += '{' + inputObject.shopFilter + '},';
            }
            if (inputObject.segmentFilter) {
                condString += '{' + inputObject.segmentFilter + '},';
            }
            if (inputObject.goodFilter) {
                condString += '{' + inputObject.goodFilter + '},';
            }

        }

        if (inputObject.dateFilter) {
            let date = olap.dateToMDX(inputObject.dateFilter, '[Даты].[Дата]');
            console.log('date is converted to:', date);

            condString +=  '{' + date + '},';
        }

        if (inputObject.periodFilter) {
            let dates = olap.getMDXPeriodNew(inputObject.periodFilter, '[Даты].[Дата]');
            console.log('period is converted to:', dates.periodString);

            condString +=  '{' + dates.periodString + '},';
        }

        condString = condString.replace(/\{\},/g,'').replace(/,$/g, '');
        
        return condString
    },

    handleMdxQueryWithAuth(queryObject, req, res) {
        let query = '';
        let options = {};
        if (typeof queryObject === 'string') {
            query = queryObject;
        } else {
            query = queryObject.query;
            options = queryObject.options;
        }
        auth.withAuth(req, res)(olap.getDataset, query)
            .then((result)=>{
                res.json(this.applyOptionsToQueryResult(olap.dataset2Tableset(result.data), options))})
            .catch((err)=>{
                if (err && err.status) {
                    res.statusCode = err.status
                }
                res.json(err)
            });
    },

    applyOptionsToQueryResult(tableSet, options) {
        if (tableSet && tableSet.data && tableSet.data.headerColumns && options && options.columns) {
            const rowHeadLastIndex = 0;
            options.columns.forEach(x => {
                for(let i = 0; i < x.range; i++) {
                    if (tableSet.data.headerColumns.length - 1 >= x.colNumber + i) {
                        tableSet.data.headerColumns[x.colNumber + i][rowHeadLastIndex].sign = x.sign;
                        //todo apllying type or do it into xmla parser
                    }
                }
            })
        }

        return tableSet;

    },

    // getDataSetWithAuth: function (query, req, res) {
    //     let result = auth.getCredentinal(req);
    //
    //     if(!result) {
    //
    //         res.statusCode = 401;
    //         res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
    //         res.end('<html><body>Need some creds son</body></html>');
    //     }
    //
    //     else {
    //
    //         const {username, password} = result;
    //
    //         if(username  && password) {   // Is the username/password correct?
    //             return olap.getDataset(query, username, password)
    //         } else {
    //             res.status(status).send({
    //                 success: false,
    //                 message: 'empty cred data'
    //             });
    //         }
    //     }
    // },

    moveToNearestFullWeekStart: function(date) {
        return m = moment(date).isoWeekday(1).add(-2, 'day').format('YYYY-MM-DD');
    },

    isFullMonth(date1, date2) {
        return moment(date1).format("YYMMDD") === moment(date1).startOf('month').format("YYMMDD") &&
            moment(date2).format("YYMMDD") === moment(date1).endOf('month').format("YYMMDD")
    }

};

module.exports = rh;