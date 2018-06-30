require('dotenv').config();

const config = {
    dwConfig: {
        user: process.env.DW_USER,
        password: process.env.DW_PASSWORD,
        server: process.env.DW_SERVER,
        database: process.env.DW_DATABASES,

        // options: {
        //     encrypt: process.env.DW_OPTIONS_ENCRYPT // Use this if you're on Windows Azure
        // }
    },

    olapConfig: {
        user: process.env.OLAP_USER,
        password: process.env.OLAP_PASSWORD,
        url: process.env.OLAP_URL,
        database: process.env.OLAP_DATABASES,

    },
};

module.exports = config;