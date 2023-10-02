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

// client game manager class:
const { GameManager } = require('./lib/game/client/game-manager');

module.exports.GameManager = GameManager;
