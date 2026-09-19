/**
 *
 * Reldens - SyncServerDriver
 *
 * Server-ONLY entry point for the Colyseus primitives used by Reldens. This file imports
 * Node-only packages (@colyseus/core, @colyseus/monitor, @colyseus/ws-transport) and must
 * never be required, directly or transitively, from any file that ends up in the browser
 * bundle. Schema primitives live in lib/sync/shared/colyseus/sync-schema-driver.js
 * specifically because they ARE isomorphic and get pulled into the client bundle via the
 * server-side schema classes (Player, BodyState, etc.).
 *
 */

const { Server, CloseCode } = require('@colyseus/core');
const { WebSocketTransport } = require('@colyseus/ws-transport');
const { monitor } = require('@colyseus/monitor');
const { Room } = require('./room');

class SyncServerDriver
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

    static get WebSocketTransport()
    {
        return WebSocketTransport;
    }

    static get monitor()
    {
        return monitor;
    }

}

module.exports.SyncServerDriver = SyncServerDriver;
