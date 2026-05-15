/**
 *
 * Reldens - ColyseusDriver
 *
 * Server-side flat entry point for Colyseus primitives used by Reldens.
 * Reldens server feature code must not require @colyseus/* directly;
 * require from this driver instead. On every Colyseus version upgrade,
 * only files under lib/communications/colyseus-driver/ should change.
 *
 * Schema primitives have their own entry at ./schema/ (isomorphic).
 * Browser primitives have their own entry at ./client/ (browser-only).
 *
 */

const { Server } = require('./server');
const { Room } = require('./room');
const { CloseCode } = require('./close-code');
const { monitor } = require('./monitor');
const { WebSocketTransport } = require('./ws-transport');

class ColyseusDriver
{

    static get Server()
    {
        return Server;
    }

    static get Room()
    {
        return Room;
    }

    static get CloseCode()
    {
        return CloseCode;
    }

    static get monitor()
    {
        return monitor;
    }

    static get WebSocketTransport()
    {
        return WebSocketTransport;
    }

}

module.exports.ColyseusDriver = ColyseusDriver;
module.exports.Server = Server;
module.exports.Room = Room;
module.exports.CloseCode = CloseCode;
module.exports.monitor = monitor;
module.exports.WebSocketTransport = WebSocketTransport;
