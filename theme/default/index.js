/**
 *
 * Reldens - Index
 *
 */

// set logger level and trace, this needs to be specified before the game manager is required:
window.RELDENS_LOG_LEVEL = 7;
window.RELDENS_ENABLE_TRACE_FOR = 'emergency,alert,critical';
// debug events (warning! this will output in the console ALL the event listeners and every event fired):
// reldens.events.debug = 'all';

const { GameManager } = require('reldens/client');
const { ClientPlugin } = require('../plugins/client-plugin');

let reldens = new GameManager();
// @NOTE: you can specify your game server and your app server URLs in case you serve the client static files from
// a different location.
// reldens.gameServerUrl = 'wss://localhost:8000';
// reldens.appServerUrl = 'https://localhost:8000';
reldens.setupCustomClientPlugin('customPluginKey', ClientPlugin);
window.addEventListener('DOMContentLoaded', () => {
    reldens.clientStart();
});

// client event listener example with version display:
reldens.events.on('reldens.afterInitEngineAndStartGame', () => {
    reldens.gameDom.getElement('#current-version').innerHTML = reldens.config.client.gameEngine.version+' -';
});

reldens.events.on('reldens.startGameAfter', () => {
    reldens.gameDom.getElement('.row-disclaimer').remove();
});

// global access is not actually required, the app can be fully encapsulated:
window.reldens = reldens;
