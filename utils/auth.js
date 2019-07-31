let jwt = require('jsonwebtoken');
const {authConfig} = require('../config');
const crypto = require('crypto'),
    algorithm = 'aes-128-cbc',
    key = Buffer.from('53345345ef78a86f', 'hex'),
    iv  = Buffer.from('b18543fd87ea7c', 'hex');

const auth = {
    withAuth: function (req, res) {
        return function (wrappedFun, param1) {

            let result = auth.getCredentinal(req);

            if (!result) {
                res.status(401).send({
                    success: false,
                    message: 'no cred data'
                });
            }

            else {

                const {username, password} = result;

                if (username && password) {   // Is the username/password correct?
                    return wrappedFun(param1, username, password)
                } else {
                    res.status(401).send({
                        success: false,
                        message: 'empty cred data'
                    });
                }
            }
        }
    },

    getCredentinal: function (req) {
        let res = null;
        const authstr = req.headers['authorization'];

        if(authstr) {
            let tmp = authstr.split(' ');   // Split on a space, the original auth looks like  "Basic Y2hhcmxlczoxMjM0NQ==" and we need the 2nd part
            const {username, password} = (tmp[0] === 'Basic') ? this.getCredentinalFromBasic(tmp[1]) : this.getCredentionalFromToken(tmp[1]);
            res = {username: username, password: password};
        }
        return res;
    },

    getCredentinalFromBasic: function (value) {
        var buf = Buffer.from(value, 'base64');
        var plain_auth = buf.toString();

        return this.getCredentinalFromSplited(plain_auth);
    },

    getCredentinalFromSplited: function (value) {
        var creds = value.split(':');
        var username = creds[0];
        var password = creds[1];

        return {username: username, password: password};
    },

    createToken: function (options) {
        const {username, password, ...rest} = options
        let cryptedCred = this.encrypt(`${username}:${password}`);

        let token = jwt.sign({cred: cryptedCred, ...rest},
            authConfig.secret,
            { expiresIn: '1440h'
            }
        );
        return token;
    },

    getCredentionalFromToken: function (value) {
        let res = {};

        // invalid token - synchronous
        try {
            let decoded = jwt.verify(value, authConfig.secret);
            let decryptedCred = this.decrypt(decoded.cred);
            res = this.getCredentinalFromSplited(decryptedCred);
        } catch(err) {
            console.log('bad token');
        }


        return res;
    },

    //for the furture
    middlewareAuth: function (req, res, next) {
        //
        // // check header or url parameters or post parameters for token
        // let status = 401;
        //
        // // decode token
        // if (status === 401 || status === 403) {
        //
        //     return res.status(status).send({
        //         success: false,
        //         message: response.message
        //     });
        // } else {
        //     next();
        // }
    },
    encrypt: function (text){
        var cipher = crypto.createCipher(algorithm, key, iv)
        var crypted = cipher.update(text,'utf8','hex')
        crypted += cipher.final('hex');
        return crypted;
    },

    decrypt: function (text){
        var decipher = crypto.createDecipher(algorithm, key, iv)
        var dec = decipher.update(text,'hex','utf8')
        dec += decipher.final('utf8');
        return dec;
    }
};

module.exports = auth;