/**
 *
 * Reldens - Index
 *
 * Server initialization and environment variables and configuration loader.
 *
 */

// setup environment variables:
const dotenv = require('dotenv');
dotenv.config();
// server class:
const ServerManager = require('./src/server/manager');
// exports server manager:
module.exports = ServerManager;

// ----------------------------------------------------------------------------------------------

// @TODO: prepare everything for NPM package and remove all the code below, just keep a commented example.

/*
// create a server instance passing the current root:
let appServer = new ServerManager({projectRoot: __dirname});
// customize as you need changing the information in the database and using events:
appServer.events.on('serverConfigFeaturesReady', (serverManager, configProcessor) => {
    // @NOTE: this already works.
    console.log('INFO - Events test serverConfigFeaturesReady success!');
});
// run the server:
console.log('Server starting...');
appServer.start().then(() => {
    console.log('Server running!');
}).catch((err) => {
    console.log('ERROR - Server error:', err);
});
*/

// ----------------------------------------------------------------------------------------------

// use example:
/* @NOTE: this will be after the package modifications for npm publication.
// to start the server you need to require the module:
const Reldens = require('reldens');
// create a server instance passing the current root:
let appServer = new Reldens({projectRoot: __dirname});
// customize as you need changing the information in the database and using events:
appServer.events.on('serverConfigFeaturesReady', (serverManager, configProcessor) => {
    console.log('INFO - Events test serverConfigFeaturesReady success!');
});
// run the server:
console.log('Server starting...');
appServer.start().then(() => {
    console.log('Server running!');
}).catch((err) => {
    console.log('ERROR - Server error:', err);
});
// be happy! :D
*/
