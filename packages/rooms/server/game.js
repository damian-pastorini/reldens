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

const { RoomLogin } = require('./login');
const { EventsManagerSingleton } = require('@reldens/utils');
const { GameConst } = require('../../game/constants');

class RoomGame extends RoomLogin
{

    async onJoin(client, options, authResult)
    {
        await EventsManagerSingleton.emit('reldens.onJoinRoomGame', client, options, authResult, this);
        // update last login:
        await this.loginManager.updateLastLogin(authResult);
        // we need to send the engine and all the general and client configurations from the storage:
        let storedClientConfig = {client: this.config.client};
        let initialStats = {initialStats: this.config.get('server/players/initialStats')};
        let clientFullConfig = Object.assign({}, this.config.gameEngine, storedClientConfig, initialStats);
        let superInitialGameData = {
            act: GameConst.START_GAME,
            sessionId: client.sessionId,
            // @TODO - BETA.17 - Index [0] is temporal since for now we only have one player by user.
            player: authResult.players[0],
            gameConfig: clientFullConfig,
            features: this.config.availableFeaturesList
        };
        await EventsManagerSingleton.emit('reldens.beforeSuperInitialGameData', superInitialGameData, this);
        // client start:
        this.send(client, superInitialGameData);
    }

}

module.exports.RoomGame = RoomGame;
