const express = require('express');
const router = express.Router();
const olap = require('../olap/olap-helper');
const helper = require('./router-helper');
const auth = require('../utils/auth');

router.post("/", function(req , res) {
    //todo here will be either ldap or table with permissions
    auth.withAuth(req, res)(olap.getDataset, 'SELECT FROM [Чеки актуальность]')
        .then((result)=>{
            res.json({
                success: true,
                token:auth.createToken(auth.getCredentinal(req))
            })
        })
        .catch((err)=>{
            console.log('err', JSON.stringify(err));
            res.json({
                success: false,
                error: err
            })
        });
});

module.exports = router;