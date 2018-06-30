var chai = require('chai');
var expect = chai.expect; // we are using the "expect" style of Chai
var olap = require('../../olap/olap');





describe('olap-other', function() {
    it('convert day to period of days', function() {
        let result = olap.getMDXPeriodFromDate('2018-06-02', -7, '[Даты]');
        expect(result.dateKey1 + ':' + result.dateKey2).to.equal('[Даты].&[2018-06-02T00:00:00]:[Даты].&[2018-05-26T00:00:00]');

    });
});