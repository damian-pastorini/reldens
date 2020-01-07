/**
 *
 * Reldens - EventsManager
 *
 * This will just export a single instance of the AwaitEventEmitter.
 *
 */

const AwaitEventEmitter = require('await-event-emitter');

module.exports.EventsManager = new AwaitEventEmitter();
