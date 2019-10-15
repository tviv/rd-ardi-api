const fs = require('fs');
const os = require("os");
const moment = require("moment");

const LOG_PATH = 'logs';

module.exports = {
  initLogPathIfNeeded: () => {
      if (!fs.existsSync(LOG_PATH)) {
          fs.mkdirSync(LOG_PATH)
      }

  },

  logUserRequest: (username, meta) => {
      try {
          if (username) {
              // if (!fs.existsSync(LOG_PATH)) {
              //     fs.mkdirSync(LOG_PATH)
              // }

              const str = `${moment().format('YYYY-MM_DD HH:mm:SS')}\t${username}\t${meta.replace(/\n/g, ' ').replace(/\s+/g, ' ')}`;
              fs.appendFile(`${LOG_PATH}/req_log.txt`, str + os.EOL, function (err) {
                  if (err) console.error("saving log: " + err)

              });
          }
      } catch (e) {
          console.error("saving log: " + e.toString())
      }
  }
};