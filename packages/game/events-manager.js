/**
 *
 * Reldens - EventsManager
 *
 * This will just export a single instance of the EventEmitter.
 *
 */

const { EventEmitter } = require('events');

module.exports.EventsManager = new EventEmitter();
