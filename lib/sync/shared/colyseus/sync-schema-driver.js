/**
 *
 * Reldens - SyncSchemaDriver
 *
 * Isomorphic (server + client bundle safe) entry point for the Colyseus schema primitives.
 * Used by schema classes (Player, BodyState, ObjectBodyState, State) that are required
 * transitively from BOTH the server runtime AND the browser bundle (the browser pulls them
 * in via lib/world/server/p2world.js which is required by debug/prediction client code).
 *
 * Importing @colyseus/schema is safe in the browser; importing @colyseus/core,
 * @colyseus/monitor, or @colyseus/ws-transport is NOT (those are Node-only). Keep this
 * file's imports limited to @colyseus/schema to preserve client bundle health.
 *
 */

const { Schema, MapSchema, ArraySchema, type, defineTypes } = require('@colyseus/schema');

class SyncSchemaDriver
{

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

module.exports.SyncSchemaDriver = SyncSchemaDriver;
