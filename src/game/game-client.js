const ColyseusClient = require('colyseus.js').Client;

class GameClient extends ColyseusClient
{

    constructor(serverUrl)
    {
        super(serverUrl);
    }

}

module.exports = GameClient;
