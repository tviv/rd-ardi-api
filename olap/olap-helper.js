const xmla4js = require("./lib/Xmla");
const moment = require('moment');
const {olapConfig} = require('../config');

let mdx  = {

    getDataset: function (query, user, password) {
        console.log(query);
        return new Promise((resolve, reject) => {
            xmla = new xmla4js.Xmla({
                async: true,
//        url: "http://10.18.2.84/OLAP/msmdpump.dll",
                url: olapConfig.url,
                username: user || olapConfig.user,
                password: password || olapConfig.password,
                shortHierahPropertyName: true,
                listeners: [
                    {events: "error", handler: function(a1, a2, a3, ){
                            console.log(a2);
                            reject(a2);
                            //debugger;
                        }},
                    {events: "request", handler: function(a1, a2, a3, a4){
                            //console.dir(a4);
                        }},
                    {events: "success", handler: function(a1, a2, a3, a4){
                        if ([...Array(a2.dataset.axisCount())].reduce((total, x, i) => total + a2.dataset.getAxis(i).numTuples, 0) === 0) {
                            resolve({
                                error: null,
                                data: null
                            });
                        } else {
                            let result = a2.dataset.fetchAsObject();
                            //console.dir(result);
                            resolve({
                                error: null,
                                data: result
                            });
                            //console.dir(a2.dataset.fetchAsObject());
                        }
                        }
                    }
                ]
            });

            xmla.execute({

                statement: query,
                properties: {
                    Catalog: olapConfig.database,
                    //Format: "Tabular",
                    Format: "Multidimensional",
                    //Content: "Data"

                }
            });

        })
    },


    /**
     * Convert dataset to more siutable thing to display in html table.
     * (assuming that only there are one ore two axes)
     *
     * @param {Object} dataset of xmla4js.
     * @return {Object}
     */
    dataset2Tableset: function (dataset) {
        let tableset = {
            headerColumns:[],
            rows:[]
        }

        if (dataset && dataset.axes.length != 0) {
            if (dataset.axes[0].positions.length > 0) {
                dataset.axes[0].positions.forEach((item) => {
                    tableset.headerColumns.push(dataset.axes[0].hierarchies.map((x)=>item[x.name]));
                });
            } else {
                //throw ('no columns');
            }

            let cellCnt = 0;
            if (dataset.axes.length >= 1) {

                let dimCols = [];
                //dataset.axes[1].

                dataset.axes[1].hierarchies.forEach((x)=>{
                    const regex = /\[([^.\]]*)\]$/g;
                    let match = regex.exec(x.name);
                    if (match !== null) {
                        x.Caption = match[1];
                    }
                    dimCols.push([x])

                });
                //tableset.headerColumns =  dimCols.concat(tableset.headerColumns);
                tableset.headerColumns = [...dimCols, ...tableset.headerColumns];

                dataset.axes[1].positions.forEach((x)=>{
                    let row = [];
                    dimCols.forEach((colgroup)=>{
                        colgroup.forEach((col)=>row.push(x[col.name]));
                    });
                    dataset.axes[0].positions.forEach((y)=>{
                        row.push(dataset.cells[cellCnt++]);
                    });
                    tableset.rows.push(row);

                });



            }

        }

        //console.log('rows:', tableset.rows.count());
        return {error: null, data: tableset};

    },

    dateToMDX: function(date, hierarchiePrefix) {
        let result = {};
        let m = moment(date);
        let dateKey = hierarchiePrefix + '.&[' + m.format('YYYY-MM-DDT00:00:00') + ']';

        return dateKey;
    },

    getMDXPeriod: function(date, addedDays, hierarchiePrefix) {
        let result = {};
        let m = moment(date);
        if (olapConfig.isGettingOnlyFullWeeks) {
            m = m.isoWeekday(1).add(-1, 'day');
        }
        result.dateKey1 = this.dateToMDX(m, hierarchiePrefix);

        let m2 = m.add(addedDays, 'day');
        result.dateKey2 = this.dateToMDX(m2, hierarchiePrefix);

        result.periodString = result.dateKey2 + ':'  + result.dateKey1;
        return result;
    }


};

module.exports = mdx;
