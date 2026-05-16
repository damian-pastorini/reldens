/**
 *
 * Reldens - SyncServerDriver
 *
 * Server-side entry point for the Colyseus primitives used by Reldens. Reldens server
 * feature code requires from here instead of @colyseus/* directly, so future Colyseus
 * version upgrades only touch this file (and ./room.js).
 *
 */

const { Server, CloseCode } = require('@colyseus/core');
const { Schema, MapSchema, ArraySchema, type, defineTypes } = require('@colyseus/schema');
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

    static get Schema()
    {
        return Schema;
    }

    static get MapSchema()
    {
        return MapSchema;
    }

    static get ArraySchema()
    {
        return ArraySchema;
    }

    static get type()
    {
        return type;
    }

    static get defineTypes()
    {
        return defineTypes;
    }

}

module.exports.SyncServerDriver = SyncServerDriver;
