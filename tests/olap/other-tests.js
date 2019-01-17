var chai = require('chai');
var expect = chai.expect; // we are using the "expect" style of Chai
var olap = require('../../olap/olap-helper');
//const moment = require('moment');
const {olapConfig} = require('../../config');




describe('olap-day convert tests', function() {
    it('convert day to period of days simple', function() {
        olapConfig.isGettingOnlyFullWeeks = false;

        let result = olap.getMDXPeriod('2018-06-02', -7, '[Даты]');
        expect('[Даты].&[2018-06-02T00:00:00]:[Даты].&[2018-05-26T00:00:00]').to.equal(result.dateKey1 + ':' + result.dateKey2);
    });

    it('convert day to period of days 2', function() {
        olapConfig.isGettingOnlyFullWeeks = true;

        let result = olap.getMDXPeriod('2018-11-30', -21, '[Даты]');
        expect('[Даты].&[2018-11-25T00:00:00]:[Даты].&[2018-11-04T00:00:00]').to.equal(result.dateKey1 + ':' + result.dateKey2);
    });

});



describe('olap-restriction tests', function() {
    it('convert one element', function() {
        let result = olap.convertValuesToMDXTupleString('[Подразделения].[Подразделение]', [ '203', '205', '206' ]);
        expect(result).to.equal('{[Подразделения].[Подразделение].&[203],[Подразделения].[Подразделение].&[205],[Подразделения].[Подразделение].&[206]}');
    });

    it('convert one element with All', function() {
        let result = olap.convertValuesToMDXTupleString('[Подразделения].[Подразделение]', [ '0' ]);
        expect(result).to.equal('{[Подразделения].[Подразделение].[All]}');
    });

    it('convert few elements', function() {
        let result = olap.convertArrValuesToMDXTupleString([ [ '[Подразделения].[Подразделение]', [ '203', '205' ] ],
            [ '[Товары].[Товары]', [ '213540', '85307' ] ] ]);
        expect(result).to.equal('{[Подразделения].[Подразделение].&[203],[Подразделения].[Подразделение].&[205]},{[Товары].[Товары].&[213540],[Товары].[Товары].&[85307]}');
    });
});
