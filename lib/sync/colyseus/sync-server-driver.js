/**
 *
 * Reldens - SyncServerDriver
 *
 * Server-side entry point for the Colyseus primitives used by Reldens.
 * Reldens server feature code requires from here instead of @colyseus/* directly,
 * so future Colyseus version upgrades only touch this file (and ./room.js).
 *
 */

const ColyseusCore = require('@colyseus/core');
const ColyseusSchema = require('@colyseus/schema');
const ColyseusWsTransport = require('@colyseus/ws-transport');
const ColyseusMonitor = require('@colyseus/monitor');
const RoomWrapper = require('./room');

class SyncServerDriver
{

    static get Server()
    {
        return ColyseusCore.Server;
    }

    static get Room()
    {
        return RoomWrapper.Room;
    }

    static get CloseCode()
    {
        return ColyseusCore.CloseCode;
    }

    static get WebSocketTransport()
    {
        return ColyseusWsTransport.WebSocketTransport;
    }

    static get monitor()
    {
        return ColyseusMonitor.monitor;
    }

    static get Schema()
    {
        return ColyseusSchema.Schema;
    }

    static get MapSchema()
    {
        return ColyseusSchema.MapSchema;
    }

    static get ArraySchema()
    {
        return ColyseusSchema.ArraySchema;
    }

    static get type()
    {
        return ColyseusSchema.type;
    }

    static get defineTypes()
    {
        return ColyseusSchema.defineTypes;
    }

}

module.exports.SyncServerDriver = SyncServerDriver;
module.exports.Server = ColyseusCore.Server;
module.exports.Room = RoomWrapper.Room;
module.exports.CloseCode = ColyseusCore.CloseCode;
module.exports.WebSocketTransport = ColyseusWsTransport.WebSocketTransport;
module.exports.monitor = ColyseusMonitor.monitor;
module.exports.Schema = ColyseusSchema.Schema;
module.exports.MapSchema = ColyseusSchema.MapSchema;
module.exports.ArraySchema = ColyseusSchema.ArraySchema;
module.exports.type = ColyseusSchema.type;
module.exports.defineTypes = ColyseusSchema.defineTypes;
