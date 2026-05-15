/**
 *
 * Reldens - SyncClientDriver
 *
 * Browser-side entry point for the Colyseus primitives used by Reldens.
 * Reldens client feature code requires from here instead of @colyseus/sdk directly,
 * so future Colyseus version upgrades only touch this file.
 *
 */

const ColyseusSdk = require('@colyseus/sdk');

class SyncClientDriver
{

    static get Client()
    {
        return ColyseusSdk.Client;
    }

    static get getStateCallbacks()
    {
        return ColyseusSdk.getStateCallbacks;
    }

}

module.exports.SyncClientDriver = SyncClientDriver;
module.exports.Client = ColyseusSdk.Client;
module.exports.getStateCallbacks = ColyseusSdk.getStateCallbacks;
