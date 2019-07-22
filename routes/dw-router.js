const express = require('express');
const router = express.Router();
const sql = require('mssql');
const {dwConfig} = require('../config');

//Function to connect to database and execute query
var  executeQuery = function(res, query){
    sql.connect(dwConfig, function (err) {
        if (err) {
            console.log("Error while connecting database :- " + err);
            res.send(err);
            sql.close();
        }
        else {
            // create Request object
            var request = new sql.Request();
            // query to the database
            request.query(query, function (err, result) {
                sql.close();
                if (err) {
                    console.log("Error while querying database :- " + err);
                    res.send(err);
                }
                else {
                    res.send(result);
                }
            });
        }
    });
}

router.get('/api/settings', (req, res) => {

    (async function () {
        let pool = undefined;
        try {
            await sql.close();
            pool = await sql.connect(dwConfig);
            let result = await pool.request()
            //.input('input_parameter', sql.Int, value)
                .query('select * from сет.Настройка');
            pool.close();
            await sql.close();

            console.dir(result);
            if (result.rowsAffected > 0 && result.recordset.length > 0) {
                res.json(result.recordset[0]);
            } else {
                res.json([]);
            }
            // Stored procedure

            // let result2 = await pool.request()
            //     .input('input_parameter', sql.Int, value)
            //     .output('output_parameter', sql.VarChar(50))
            //     .execute('procedure_name')
            //
            // console.dir(result2)
            pool.close();
        } catch (err) {
            console.dir(err);
            if (pool) {
                pool.close();
                pool = undefined;
            }
            await sql.close();
            res.json([]);
        } finally {

        }
    })();
});

//PUT API
router.put("/api/settings", function(req , res){
    console.dir(req.body);
    var query = "UPDATE сет.Настройка SET ЧекиРегулярнаяГлубинаСканированияДни= " + req.body.ЧекиРегулярнаяГлубинаСканированияДни;
    executeQuery (res, query);
});

sql.on('error', err => {
    console.dir('cccc');
});

module.exports = router;