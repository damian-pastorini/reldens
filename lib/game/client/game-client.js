/**
 *
 * Reldens - GameClient
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
