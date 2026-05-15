/**
 *
 * Reldens - ColyseusDriver / client entry point
 *
 * Flat entry point for the browser-side primitives. Reldens client code
 * requires from here, destructured.
 *
 */

const { Client } = require('./client');
const { getStateCallbacks } = require('./state-callbacks');

module.exports.Client = Client;
module.exports.getStateCallbacks = getStateCallbacks;
