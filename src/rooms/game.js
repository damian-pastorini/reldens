/**
 *
 * Reldens - RoomGame
 *
 * This room is the game lobby and for now it will just start the game using the loginManager.
 * The client will automatically disconnect from this room once it received the data.
 * If the client was hacked then the user will be disconnected when it joins the next RoomScene.
 * See RoomScene.onJoin method.
 *
 */

const RoomLogin = require('./login');

class RoomGame extends RoomLogin
{

    async onJoin(client, options, authResult)
    {
        await this.loginManager.startGame(client, this, authResult);
    }

}

module.exports = RoomGame;
