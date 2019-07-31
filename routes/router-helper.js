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
            let dates = olap.getMDXPeriod(inputObject.periodFilter.date, inputObject.periodFilter.days, '[Даты].[Дата]');
            console.log('period is converted to:', dates.periodString);

            condString +=  '{' + dates.periodString + '},';
        }

        condString = condString.replace(/\{\},/g,'').replace(/,$/g, '');
        
        return condString
    },

    handleMdxQueryWithAuth(query, req, res) {
        auth.withAuth(req, res)(olap.getDataset, query)
            .then((result)=>{
                res.json(olap.dataset2Tableset(result.data))})
            .catch((err)=>{
                if (err && err.status) {
                    res.statusCode = err.status
                }
                res.json(err)
            });
    }

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



};

module.exports = rh;