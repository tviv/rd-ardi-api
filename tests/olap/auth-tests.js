var chai = require('chai');
var expect = chai.expect; // we are using the "expect" style of Chai
const auth = require('../../utils/auth');

describe('auth - basic', function() {
    it('all valid', () => {
        let result = auth.getCredentinalFromBasic('dGVzdDp0ZXN0MTIz');
        expect(`${result.username}-${result.password}`).to.equal('test-test123');
    });
});

describe('auth - token', function() {
    it('create - token', () => {
        let result = auth.createToken({username: 'test', password:'test123'});

        //eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVkIjoiODY2MWVkNWY3NWMxYjgzNzU0MDAzNDllMTdkNWYzOTIiLCJpYXQiOjE1NjQ1NDgwOTMsImV4cCI6MTU2OTczMjA5M30.dDJGS2qTKP9AsRy5h-A7fQlQbhh-lQ5D03ULwN0LeaI
        expect(result.split('.')[0]).to.equal('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    });

    it('auth - token', () => {
        let result = auth.getCredentionalFromToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVkIjoiODY2MWVkNWY3NWMxYjgzNzU0MDAzNDllMTdkNWYzOTIiLCJpYXQiOjE1NjQ1NDgwOTMsImV4cCI6MTU2OTczMjA5M30.dDJGS2qTKP9AsRy5h-A7fQlQbhh-lQ5D03ULwN0LeaI');

        expect(`${result.username}-${result.password}`).to.equal('test-test123');
    });

});

