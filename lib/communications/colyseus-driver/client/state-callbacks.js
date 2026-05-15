/**
 *
 * Reldens - ColyseusDriver / getStateCallbacks (browser)
 *
 * Re-export of @colyseus/sdk getStateCallbacks. The existing StateCallbacksManager
 * and RoomStateEntitiesManager classes (under lib/game/client/communication/)
 * require getStateCallbacks from this file instead of from @colyseus/sdk directly,
 * so any future client-package rename only affects this wrapper.
 *
 */

const { getStateCallbacks } = require('@colyseus/sdk');

module.exports.getStateCallbacks = getStateCallbacks;
