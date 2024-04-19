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
const { RoomsConst } = require('../constants');
const { GameConst } = require('../../game/constants');
const { Logger, sc } = require('@reldens/utils');

class RoomGame extends RoomLogin
{

    onCreate(props)
    {
        super.onCreate(props);
        this.roomType = RoomsConst.ROOM_TYPE_GAME;
        Logger.info('Created RoomGame: '+this.roomName+' - ID: '+this.roomId);
    }

    async onJoin(client, options, userModel)
    {
        await this.events.emit('reldens.onJoinRoomGame', client, options, userModel, this);
        await this.loginManager.updateLastLogin(userModel);
        this.loginManager.activeUsers[userModel.username] = {
            sessionId: client.sessionId,
            id: userModel.id,
            roleId: userModel.role_id
        };
        this.loginManager.activeUsersSessionIds[client.sessionId] = userModel.username;
        // we need to send the engine and all the general and client configurations from the storage:
        let storedClientConfig = {client: this.config.client};
        let clientFullConfig = Object.assign({}, this.config.gameEngine, storedClientConfig);
        let superInitialGameData = {
            act: GameConst.START_GAME,
            sessionId: client.sessionId,
            players: userModel.players,
            // @NOTE: if multiplayer is disabled then we will use the first one as default:
            player: 0 < sc.length(userModel.players) ? userModel.players[0] : false,
            gameConfig: clientFullConfig,
            features: this.config.availableFeaturesList,
            userName: userModel.username,
            guestPassword: options.password
        };
        await this.events.emit('reldens.beforeSuperInitialGameData', superInitialGameData, this, client, userModel);
        client.send('*', superInitialGameData);
    }

    async handleReceivedMessage(client, message)
    {
        if(!sc.hasOwn(message, 'act') || message.act !== GameConst.CREATE_PLAYER){
            return;
        }
        message.formData.user_id = client.auth.id;
        let result = await this.loginManager.createNewPlayer(message.formData);
        result.act = GameConst.CREATE_PLAYER_RESULT;
        return client.send('*', result);
    }

    async onLeave(client, consented)
    {
        delete this.loginManager.activeUsers[this.loginManager.activeUsersSessionIds[client.sessionId]];
        delete this.loginManager.activeUsersSessionIds[client.sessionId];
    }

}

module.exports.RoomGame = RoomGame;
