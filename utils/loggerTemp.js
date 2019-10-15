const fs = require('fs');
const path = require('path');
const os = require("os");
const moment = require("moment");

const LOG_PATH = path.join(__dirname, '../../', 'logs');

module.exports = {
  initLogPathIfNeeded: () => {
      if (!fs.existsSync(LOG_PATH)) {
          fs.mkdirSync(LOG_PATH,{ recursive: true })
      }

  },

  logUserRequest: (username, meta) => {
      try {
          if (username) {
              // if (!fs.existsSync(LOG_PATH)) {
              //     fs.mkdirSync(LOG_PATH)
              // }

              const str = `${moment().format('YYYY-MM_DD HH:mm:SS')}\tDATASET_REQUEST\t${username}\t${meta.replace(/\n/g, ' ').replace(/\s+/g, ' ')}`;
              console.log(str);
              fs.appendFileSync(path.join(LOG_PATH, 'req_log.txt'), str + os.EOL);
          }
      } catch (e) {
          console.error("saving log: ", e)
      }
  }
};