/**
 *
 * RoomGame
 *
 * This object room is just for send the player data to the client.
 * The client will automatically disconnect from this room once it received the data.
 * If the client was hacked then the user will be disconnected when it joins the next RoomScene.
 * See RoomScene.onJoin method.
 *
 */

const RoomLogin = require('./login');
const Player = require('../player/player');
const share = require('../utils/constants');

class RoomGame extends RoomLogin
{

    onJoin(client, options, authResult)
    {
        // create player:
        let newPlayer = new Player(authResult, client.sessionId);
        // update last login is done here since the first login action only happens in this room:
        newPlayer.updateLastLogin();
        // client start:
        this.send(client, {act: share.START_GAME, sessionId: client.sessionId, player: newPlayer});
    }

}

module.exports = RoomGame;
