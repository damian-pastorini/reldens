/**
 *
 * Reldens - GameServer
 *
 * This class extends Colyseus server to include new features and implement all the custom behaviors.
 * This will not override any of the code features.
 *
 */

const { Server } = require('colyseus');
const Monitor = require('@colyseus/monitor');
const { Logger } = require('@reldens/utils');

class GameServer extends Server
{

    constructor(options)
    {
        super(options);
        // set shutdown callback:
        this.onShutdown(() => this.runOnShutDown());
    }

    initMonitor()
    {
        return Monitor.monitor(this);
    }

    runOnShutDown()
    {
        Logger.info('Game Server is going down.');
    }

}

module.exports.GameServer = GameServer;
