/**
 *
 * Reldens - SyncClientDriver
 *
 * Browser-side entry point for the Colyseus primitives used by Reldens. Reldens client
 * feature code requires from here instead of @colyseus/sdk directly, so future Colyseus
 * version upgrades only touch this file.
 *
 */

const { Client, CloseCode, getStateCallbacks } = require('@colyseus/sdk');

class SyncClientDriver
{

    static get Client()
    {
        return Client;
    }

    static get CloseCode()
    {
        return CloseCode;
    }

    static get getStateCallbacks()
    {
        return getStateCallbacks;
    }

}

module.exports.SyncClientDriver = SyncClientDriver;
