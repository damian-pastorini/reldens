/**
 *
 * Reldens - GameClient
 *
 */

const { Client } = require('colyseus.js');
const { RoomsConst } = require('../../rooms/constants');
const { Logger } = require('@reldens/utils');

class GameClient extends Client
{

    constructor(serverUrl)
    {
        super(serverUrl);
    }

    async joinOrCreate(roomName, options, rootSchema)
    {
        try {
            return await super.joinOrCreate(roomName, options, rootSchema);
        } catch (error) {
            if(RoomsConst.ERRORS.CREATING_ROOM_AWAIT === error.message){
                await new Promise(resolve => setTimeout(resolve, 500));
                return await this.joinOrCreate(roomName, options, rootSchema);
            }
            Logger.error('Joining room error: '+error.message);
            return false;
        }
    }

}

module.exports.GameClient = GameClient;
