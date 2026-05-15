/**
 *
 * Reldens - ColyseusDriver / type
 *
 * Re-export of @colyseus/schema type() decorator factory. Reldens uses the
 * post-class form: type('string')(State.prototype, 'sceneData').
 *
 */

const { type } = require('@colyseus/schema');

module.exports.type = type;
