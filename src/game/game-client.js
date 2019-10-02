/**
 *
 * Reldens - GameClient
 *
 * This class will extend Colyseus.Client to include any all the customizations.
 *
 */

const ColyseusClient = require('colyseus.js').Client;

class GameClient extends ColyseusClient
{

    constructor(serverUrl)
    {
        super(serverUrl);
    }

}

module.exports = GameClient;
