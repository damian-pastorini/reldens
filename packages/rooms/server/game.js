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
const { Logger, sc } = require('@reldens/utils');
const { GameConst } = require('../../game/constants');

class RoomGame extends RoomLogin
{

    onCreate(props)
    {
        super.onCreate(props);
        Logger.info('Created RoomGame: '+this.roomName+' - ID: '+this.roomId);
    }

    async onJoin(client, options, authResult)
    {
        await this.events.emit('reldens.onJoinRoomGame', client, options, authResult, this);
        // update last login:
        await this.loginManager.updateLastLogin(authResult);
        // we need to send the engine and all the general and client configurations from the storage:
        let storedClientConfig = {client: this.config.client};
        let clientFullConfig = Object.assign({}, this.config.gameEngine, storedClientConfig);
        let superInitialGameData = {
            act: GameConst.START_GAME,
            sessionId: client.sessionId,
            players: authResult.players,
            // if multiplayer is disabled then we will use the first one as default:
            player: authResult.players ? authResult.players[0] : false,
            gameConfig: clientFullConfig,
            features: this.config.availableFeaturesList
        };
        await this.events.emit('reldens.beforeSuperInitialGameData', superInitialGameData, this);
        // client start:
        this.send(client, superInitialGameData);
    }

    async onMessage(client, message)
    {
        if(!sc.hasOwn(message, 'act') || message.act !== GameConst.CREATE_PLAYER){
            return false;
        }
        message.formData.user_id = client.auth.id;
        let result = await this.loginManager.createNewPlayer(message.formData);
        result.act = GameConst.CREATE_PLAYER_RESULT;
        this.send(client, result);
    }

}

module.exports.RoomGame = RoomGame;
