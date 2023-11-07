/**
 *
 * Reldens - GameManager
 *
 */

// transpile and polyfill:
require('core-js/stable');
require('regenerator-runtime/runtime');

const { GameManager } = require('./lib/game/client/game-manager');

module.exports.GameManager = GameManager;
