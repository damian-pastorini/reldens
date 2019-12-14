/**
 *
 * Reldens - GameClient
 *
 * This class will extend Colyseus.Client to include any all the customizations.
 *
 */

const { Client } = require('colyseus.js');

class GameClient extends Client
{

    constructor(serverUrl)
    {
        super(serverUrl);
    }

}

module.exports.GameClient = GameClient;
