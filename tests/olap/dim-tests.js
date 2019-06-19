var chai = require('chai');
var expect = chai.expect; // we are using the "expect" style of Chai
var olap = require('../../olap/olap-helper');
//const moment = require('moment');
const {olapConfig} = require('../../config');



describe('olap-get_dim', function() {
    this.timeout(3000);
    it('getting dimention', async () => {
        const result = await olap.getDimension('[Подразделения].[Организации]', 2);
            console.dir(result.data);
            console.log(result.data.length);
            expect(result.data.length).to.be.above(70);
    });

    it('getting dimention2', async () => {
        const result = await olap.getDimension('[Признаки товара].[Категории]', 2);
        console.dir(result.data);
        console.log(result.data.length);
        expect(result.data.length).to.be.above(70);
    });

    it('getting dimention3', async () => {
        const result = await olap.getDimension('[Товары].[Поставщик]');
        console.dir(result.data);
        console.log(result.data.length);
        expect(result.data.length).to.be.above(70);
    });

    it('getting dimention [Даты].[Месяцы]', async () => {
        const result = await olap.getDimension('[Даты].[Месяцы]');
        console.dir(result.data);
        console.log(result.data.length);
        expect(result.data.length).to.be.above(70);
    });

    it ('get member key from unic name', () => {
        const result = olap.getMemberKeyFromUnicName('[Даты].[Месяцы].[Дата].&[2016-08-01T00:00:00]');
        expect(result).to.be.equal('2016-08-01T00:00:00');
    });

    let data = [
        //{MEMBER_UNIQUE_NAME: 0, PARENT_UNIQUE_NAME:  null },
        {MEMBER_CAPTION: '1', MEMBER_UNIQUE_NAME: 1, PARENT_UNIQUE_NAME:  0 },
        {MEMBER_CAPTION: '2', MEMBER_UNIQUE_NAME: 2, PARENT_UNIQUE_NAME:  0 },
        {MEMBER_CAPTION: '1.1', MEMBER_UNIQUE_NAME: 1.1, PARENT_UNIQUE_NAME:  1 },
        {MEMBER_CAPTION: '1.2', MEMBER_UNIQUE_NAME: 1.2, PARENT_UNIQUE_NAME:  1 },
        {MEMBER_CAPTION: '1.3', MEMBER_UNIQUE_NAME: 1.3, PARENT_UNIQUE_NAME:  1 },
        {MEMBER_CAPTION: '1.4', MEMBER_UNIQUE_NAME: 1.4, PARENT_UNIQUE_NAME:  1 },
        {MEMBER_CAPTION: '2.1', MEMBER_UNIQUE_NAME: 2.1, PARENT_UNIQUE_NAME:  2 },
        {MEMBER_CAPTION: '2.2', MEMBER_UNIQUE_NAME: 2.2, PARENT_UNIQUE_NAME:  2 },
        {MEMBER_CAPTION: '2.3', MEMBER_UNIQUE_NAME: 2.3, PARENT_UNIQUE_NAME:  2 },
        {MEMBER_CAPTION: '1.2.1', MEMBER_UNIQUE_NAME: 1.21, PARENT_UNIQUE_NAME: 1.2  },
        {MEMBER_CAPTION: '1.2.2', MEMBER_UNIQUE_NAME: 1.22, PARENT_UNIQUE_NAME: 1.2  },
    ];

    let data2 = [
        {MEMBER_CAPTION: 'All', MEMBER_UNIQUE_NAME: 0, PARENT_UNIQUE_NAME:  null },
        {MEMBER_CAPTION: '10', MEMBER_UNIQUE_NAME: 1, PARENT_UNIQUE_NAME:  0 },
        {MEMBER_CAPTION: '1.1', MEMBER_UNIQUE_NAME: 1.1, PARENT_UNIQUE_NAME:  0 },
        {MEMBER_CAPTION: '1.2', MEMBER_UNIQUE_NAME: 1.2, PARENT_UNIQUE_NAME:  0 },
        {MEMBER_CAPTION: '1.3', MEMBER_UNIQUE_NAME: 1.3, PARENT_UNIQUE_NAME:  0 },
        {MEMBER_CAPTION: '1.4', MEMBER_UNIQUE_NAME: 1.4, PARENT_UNIQUE_NAME:  0 },
        {MEMBER_CAPTION: '1.2.1', MEMBER_UNIQUE_NAME: 1.21, PARENT_UNIQUE_NAME: 0  },
        {MEMBER_CAPTION: '1.2.2', MEMBER_UNIQUE_NAME: 1.22, PARENT_UNIQUE_NAME: 0  },
        {MEMBER_CAPTION: '20', MEMBER_UNIQUE_NAME: 2, PARENT_UNIQUE_NAME:  0 },
        {MEMBER_CAPTION: '2.1', MEMBER_UNIQUE_NAME: 2.1, PARENT_UNIQUE_NAME:  0 },
        {MEMBER_CAPTION: '2.2', MEMBER_UNIQUE_NAME: 2.2, PARENT_UNIQUE_NAME:  0 },
        {MEMBER_CAPTION: '2.3', MEMBER_UNIQUE_NAME: 2.3, PARENT_UNIQUE_NAME:  0 },
    ];


    it('creating tree', async () => {
        let tree = olap.getTree(data);
        console.dir(tree);
        expect(tree.length).to.equal(2);

    });



    it('creating tree 2', async () => {

        let tree = olap.getTree(data2);
        //console.dir(tree);
        expect(tree.length).to.equal(1);

    });

    it('getting dimention as tree', async () => {
        const result = await olap.getDimensionAsTree({hierarchyName: '[Подразделения].[Подразделение]'});
        //console.dir(result.data);
        console.log(result.data.length);
        expect(result.data.length).to.be.gt(0);
        expect(result.data.length).to.be.lt(2);
    });


    it('getting dimention as tree 2', async () => {
        const result = await olap.getDimensionAsTree({hierarchyName: '[Товары].[Товары]', maxLevel:2});
        //console.dir(result.data);
        console.log(result.data.length);
        expect(result.data.length).to.be.gt(0);
        expect(result.data.length).to.be.lt(2);

    });


    it('getting dimention as tree [Даты].[Месяцы]', async () => {
        const result = await olap.getDimensionAsTree({hierarchyName: '[Даты].[Месяцы]', maxLevel:2});
        //console.dir(result.data);
        console.log(result.data.length);
        expect(result.data.length).to.be.gt(0);
        expect(result.data.length).to.be.lt(2);

    });

});