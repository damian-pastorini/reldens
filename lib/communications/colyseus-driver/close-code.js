/**
 *
 * Reldens - ColyseusDriver / CloseCode
 *
 * Re-export of @colyseus/core CloseCode constants for use inside Reldens code
 * that needs to inspect WebSocket close codes (currently only the Room wrapper
 * uses CloseCode.CONSENTED internally).
 *
 */

const { CloseCode } = require('@colyseus/core');

module.exports.CloseCode = CloseCode;
