/**
 *
 * Reldens - ColyseusDriver / defineTypes
 *
 * Re-export of @colyseus/schema defineTypes() utility. Used in
 * lib/users/server/player.js to attach schema definitions to a class after
 * the class body (defineTypes(Player, {state: BodyState})).
 *
 */

const { defineTypes } = require('@colyseus/schema');

module.exports.defineTypes = defineTypes;
