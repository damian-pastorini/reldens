/**
 *
 * Reldens - GameServer
 *
 * This class extends Colyseus server to include new features and implement all the custom behaviors.
 * This will not override any of the code features.
 *
 */

const ColyseusServer = require('colyseus').Server;
const monitor = require('@colyseus/monitor');

class GameServer extends ColyseusServer
{

    constructor(options)
    {
        super(options);
        // set shutdown callback:
        this.onShutdown(this.runOnShutDown);
    }

    initMonitor()
    {
        return monitor.monitor(this);
    }

    runOnShutDown()
    {
        console.log('INFO - Game Server is going down.');
    }

}

module.exports = GameServer;
