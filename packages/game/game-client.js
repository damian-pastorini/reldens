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

    // @TODO: - Seiyria - this is implied, you don't really need this constructor
    constructor(serverUrl)
    {
        super(serverUrl);
    }

}

module.exports = GameClient;
