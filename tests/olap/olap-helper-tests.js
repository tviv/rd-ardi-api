var chai = require('chai');
var expect = chai.expect; // we are using the "expect" style of Chai
var olap = require('../../olap/olap-helper');
//const moment = require('moment');
const {olapConfig} = require('../../config');




describe('olap-helper convert tests', function() {
    it('convert UName to array values', function() {

        let result = olap.convertMDXHierarchyElementToArrValues('[Даты].[Месяцы].[Дата].&[2019-04-01T00:00:00]');
        expect('["[Даты].[Месяцы].[Дата]",["2019-04-01T00:00:00"]]').to.equal(JSON.stringify(result));
    });

    it('convert array filter with string inside', function() {

        let result = olap.convertArrValuesToMDXTupleString([
                "[Даты].[Месяцы].[Дата].&[2019-04-01T00:00:00]",
                [
                    "[Подразделения].[Организации]",
                    [
                        "268"
                    ]
                ]
            ]);
        expect(JSON.stringify(result)).to.equal('"{[Даты].[Месяцы].[Дата].&[2019-04-01T00:00:00]},{[Подразделения].[Организации].&[268]}"');
    });

});

