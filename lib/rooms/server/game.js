/**
 *
 * Reldens - RoomGame
 *
 * This room is the game lobby room to hold every logged user.
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
        Logger.notice('Created RoomGame: '+this.roomName+' ('+this.roomId+')');
        delete props.roomsManager.creatingInstances[this.roomName];
        this.loginManager.activePlayers.gameRoomInstanceId = this.roomId;
    }

    async onJoin(client, options, userModel)
    {
        await this.events.emit('reldens.onJoinRoomGame', client, options, userModel, this);
        let loggedUser = this.activePlayerByUserName(userModel.username, this.roomId, false);
        if(loggedUser){
            //Logger.debug('Disconnecting already logged user: "'+userModel.username+'".');
            // check if user is already logged and disconnect from the all the previous rooms:
            await this.disconnectUserFromEveryOtherRoom(userModel);
        }
        if(!await this.loginManager.updateLastLogin(userModel)){
            //Logger.debug('Last login update error on user: "'+userModel.username+'".');
            client.send('*', {[GameConst.ACTION_KEY]: GameConst.LOGIN_UPDATE_ERROR});
            return false;
        }
        this.loginManager.activePlayers.add(userModel, client, this);
        // we need to send the engine and all the general and client configurations from the storage:
        let storedClientConfig = {client: this.config.client};
        let clientFullConfig = Object.assign({}, this.config.gameEngine, storedClientConfig);
        // @TODO - BETA - Reduce superInitialGameData by passing the data on the initial request.
        let superInitialGameData = {
            [GameConst.ACTION_KEY]: GameConst.START_GAME,
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

    async onLeave(client, consented)
    {
        let activePlayer = this.activePlayerBySessionId(client.sessionId, this.roomId, false);
        this.loginManager.activePlayers.removeAllByUserId(activePlayer.userId);
    }

    async disconnectUserFromEveryOtherRoom(userModel)
    {
        return await this.loginManager.disconnectUserFromEveryRoom(userModel, true);
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

}

module.exports.RoomGame = RoomGame;
