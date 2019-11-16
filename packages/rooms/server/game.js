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
const { GameConst } = require('../../game/constants');

class RoomGame extends RoomLogin
{

    async onJoin(client, options, authResult)
    {
        // update last login:
        await this.loginManager.updateLastLogin(authResult);
        // we need to send the engine and all the general and client configurations from the storage:
        let storedClientAndGeneral = {client: this.config.client, general: this.config.general};
        let clientFullConfig = Object.assign({}, this.config.gameEngine, storedClientAndGeneral);
        // client start:
        this.send(client, {
            act: GameConst.START_GAME,
            sessionId: client.sessionId,
            player: authResult.players[0],
            gameConfig: clientFullConfig,
            features: this.config.availableFeaturesList
        });
    }

}

module.exports = RoomGame;
