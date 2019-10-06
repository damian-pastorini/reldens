/**
 *
 * Reldens - ServerEvents
 *
 * This will just export a single instance of the EventEmitter.
 *
 */

const events = require('events');

module.exports = new events.EventEmitter();
