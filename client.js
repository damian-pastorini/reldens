/**
 *
 * Reldens - Client
 *
 * Client main class shortcut.
 *
 */

// transpile and polyfill:
require('core-js/stable');
require('regenerator-runtime/runtime');
// game class:
const { GameManager } = require('./lib/game/client/manager');
// export game manager:
module.exports.GameManager = GameManager;
