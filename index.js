/**
 *
 * Reldens - index
 *
 * Server initialization and environment variables and configuration loader.
 *
 */

// setup environment variables:
const dotenv = require('dotenv');
dotenv.config();
// load default configuration:
const config = require('./config/config');
// setup project root path:
config.projectRoot = __dirname;
// server class:
const ServerManager = require('./src/server/server-manager');
// create create instance:
let server = new ServerManager();
// start the server:
server.start(config);
