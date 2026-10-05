/**
 *
 * Reldens - SyncClientDriver
 *
 * Browser-side entry point for the Colyseus primitives used by Reldens. Reldens client
 * feature code requires from here instead of @colyseus/sdk directly, so future Colyseus
 * version upgrades only touch this file.
 *
 */

const { Client, getStateCallbacks } = require('@colyseus/sdk');

class SyncClientDriver
{

    static get Client()
    {
        return Client;
    }

    static get getStateCallbacks()
    {
        return getStateCallbacks;
    }

}

module.exports.SyncClientDriver = SyncClientDriver;
