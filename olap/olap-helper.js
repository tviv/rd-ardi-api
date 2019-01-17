const xmla4js = require("./lib/Xmla");
const moment = require('moment');
const {olapConfig} = require('../config');

const F_NAME    = 'MEMBER_CAPTION';
const F_UNAME   = 'MEMBER_UNIQUE_NAME';
const F_PUNAME  = 'PARENT_UNIQUE_NAME';
const F_KEY     = 'MEMBER_KEY';

let mdx  = {

    getXmla: (user, password) => {
        return new xmla4js.Xmla({
            async: true,
//        url: "http://10.18.2.84/OLAP/msmdpump.dll",
            url: olapConfig.url,
            username: user || olapConfig.user,
            password: password || olapConfig.password,
            shortHierahPropertyName: true
        });
    },

    getDataset: function (query, user, password) {
        console.log(query);
        return new Promise((resolve, reject) => {
            xmla = this.getXmla(user, password);

            xmla.execute({

                statement: query,
                properties: {
                    Catalog: olapConfig.database,
                    //Format: "Tabular",
                    Format: "Multidimensional",
                    //Content: "Data"

                },
                error: function(xmla, request, response){
                    console.log(response);
                    reject({error: response.message});
                },
                success: function(xmla, request, response){
                    if ([...Array(request.dataset.axisCount())].reduce((total, x, i) => total + request.dataset.getAxis(i).numTuples, 0) === 0) {
                        resolve({
                            error: null,
                            data: null
                        });
                    } else {
                        let result = request.dataset.fetchAsObject();
                        //console.dir(result);
                        resolve({
                            error: null,
                            data: result
                        });
                        //console.dir(a2.dataset.fetchAsObject());
                    }
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
    },

    getDimension: (hierarchyName, maxLevel = 0, rows_, i = 0) => {
        let xmla = mdx.getXmla();

        return new Promise((resolve, reject) => {
            let rows = rows_ || [];

                restrictions = {
                    CUBE_NAME: 'Чеки',
                    HIERARCHY_UNIQUE_NAME: hierarchyName,
                };
                if (maxLevel > 0) restrictions.LEVEL_NUMBER = i;

                xmla.discoverMDMembers({
                    restrictions,
                    error: function (xmla, request, response) {
                        console.log(request);
                        reject(request);
                    },
                    success: function (xmla, request, response) {
                        response.eachRow(function (row) {
                            rows.push(row);
                            // console.log(
                            //     row["LEVEL_NUMBER"], row["MEMBER_UNIQUE_NAME"], row["MEMBER_NAME"], row["PARENT_UNIQUE_NAME"]
                            // );
                        });
                        if (i >= maxLevel) {
                            resolve({
                                error: null,
                                data: rows
                            });
                        } else {
                            resolve(mdx.getDimension(hierarchyName, maxLevel, rows, ++i));
                        }

                    }
                });
        });
    },


    getTree: (data, isShortFormat = true, pKey_ = null, start = 0) => {
        if (data == null || data.length == 0) return null;
        let pKey = pKey_ !== null ? pKey_ : data[0][F_PUNAME];
        let tree = [];

        let firstFound = false;
        for(let i = start; i < data.length; i++) {
            if (data[i][F_PUNAME] === pKey) {
                firstFound = true;
                if (data[i][F_NAME] == null) {
                    //console.log(data[i]);
                    continue;
                }
                let e = {label: data[i][F_NAME], value: (isShortFormat ? data[i][F_KEY] : data[i]) || ''};
                tree.push(e);

                children = mdx.getTree(data, isShortFormat, data[i][F_UNAME], i);
                if (children.length > 0) e.children = children;
                if (data[i][F_PUNAME] === null) {e.isAll = true}
            } else if (firstFound) {
                break;
            }
        }

        // if (!pKey_ && tree.length > 1 && isShortFormat) { //no 0 level, we would add it
        //     tree = [[{label: 'All', value:data[0][F_PUNAME], children:tree}]];
        // }

        return tree;
    },

    getDimensionAsTree: (options) => {
        return new Promise((resolve, reject) => {
            mdx.getDimension(options.hierarchyName, options.maxLevel).then((res) => {
                if (res.error != null) {
                    resolve(res);
                } else {
                    resolve({error: null, data: mdx.getTree(res.data, options.isShortFormat)});
                }
            }).catch((e) => reject({error: e}));

        });
    },

    convertArrValuesToMDXTupleString: function(values) {
        if (!(values instanceof Array)) return null;

        arr = values.map(x=>this.convertValuesToMDXTupleString(x[0], x[1]));
        return arr.join(',');
    },

    convertValuesToMDXTupleString: function(hierarchyName, values) {
        if (!(values instanceof Array)) return null;

        let result = `{${values.map(x=>`${hierarchyName}.${(x == '0' ? '[All]' : `&[${x}]`)}`).join(',')}}`;
        return result;
    }
};

module.exports = mdx;
