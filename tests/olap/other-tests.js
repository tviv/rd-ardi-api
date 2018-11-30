var chai = require('chai');
var expect = chai.expect; // we are using the "expect" style of Chai
var olap = require('../../olap/olap-helper');
//const moment = require('moment');
const {olapConfig} = require('../../config');




describe('olap-other', function() {
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