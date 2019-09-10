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
// server class:
const ServerManager = require('./src/server/manager');
// create create instance:
let server = new ServerManager();
// start the server passing the app root data:
server.start({projectRoot: __dirname}).then(() => {
    console.log('Server running...');
}).catch((err) => {
    console.log('ERROR - Server error:', err);
});
