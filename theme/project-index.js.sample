/**
 *
 * Reldens - NPM Test
 *
 * Server initialization and events.
 * This is a test example file on how the server can be initialized.
 *
 */

// required the module:
const { ServerManager } = require('reldens/server');
// require the custom classes config file:
const { CustomClasses } = require('./theme/packages/server'); // {} // you can pass en empty object.
// you can find an example of the server file in node_modules/reldens/theme/packages/server.js
// create a server instance passing the current root:
let appServer = new ServerManager({
    projectRoot: __dirname, // we need to pass the server root
    projectTheme: 'custom-game-theme-test', // if the project theme is not specified then "default" will be used
    customClasses: CustomClasses // {} // custom configured custom classes
});
// events debug:
// appServer.events.debug = 'all'; // or any string containing multiple events keys.
// setup as you need:
// eslint-disable-next-line no-unused-vars
appServer.events.on('reldens.serverConfigFeaturesReady', (serverManager, configProcessor) => {
    console.log('INFO - Events test reldens.serverConfigFeaturesReady success!');
});
// run the server!
console.log('Server starting...');
appServer.start().then(() => {
    console.log('INFO - SERVER UP AND RUNNING!');
}).catch((err) => {
    console.log('ERROR - Server error:', err);
});
