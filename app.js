'use strict'

const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');

const dwRouter = require('./routes/dw-router');
const olapRouter = require('./routes/olap-router');
const authRouter = require('./routes/auth-router');
const path = require('path');

var cors = require('cors');

const app = express();
// Body Parser Middleware
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));

//app.use(cors()); //todo
app.set('port', (process.env.PORT || 3101));

app.use('/', dwRouter);
app.use('/api/auth', authRouter);
app.use('/api/olap', olapRouter);

//Express only serves static assets in production
console.log("NODE_ENV: ", process.env.NODE_ENV);
console.log("OLAP_URL: ", process.env.OLAP_URL);
console.log("__dirname: ", __dirname);
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname,'../protop1/main/build')));

    // Return the main index.html, so react-router render the route in the client
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, '../protop1/main/build', 'index.html'));
    });
}

//catch 404 and forward to error handler
// app.use(function(req, res, next) {
//     next(createError(404));
// });

// error handler
// app.use(function(err, req, res, next) {
//     // set locals, only providing error in development
//     res.locals.message = err.message;
//     res.locals.error = req.app.get('env') === 'development' ? err : {};
//
//     // render the error page
//     res.status(err.status || 500);
//     res.render('error');
// });

// var http = require('http');
// http.createServer(app).listen(app.get('port'));

let server = app.listen(app.get('port'), () => {
    console.log(`listen port: ${app.get('port')}`);

});
