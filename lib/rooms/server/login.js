/**
 *
 * Reldens - RoomLogin
 *
 * This room is the base to authenticate every single client join.
 * Since we are hitting the storage to validate the client we doing it on each join.
 *
 */

const { Room } = require('colyseus');
const { RoomsConst } = require('../constants');
const { ErrorManager, Logger, sc } = require('@reldens/utils');

class RoomLogin extends Room
{

    onCreate(options)
    {
        this.roomType = RoomsConst.ROOM_TYPE_LOGIN;
        this.events = sc.get(options, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in RoomLogin.');
        }
        this.dataServer = sc.get(options, 'dataServer', false);
        this.config = options.config;
        this.loginManager = options.loginManager;
        // @NOTE: validateRoomData is overridden in RoomScene onCreate.
        this.validateRoomData = false;
        options.roomsManager.createdInstances[this.roomId] = this;
        this.events.emitSync('reldens.roomLoginOnCreate', {roomLogin: this, options});
        this.onMessage('*', async (client, message) => {
            await this.handleReceivedMessage(client, message);
        });
    }

    async handleReceivedMessage(client, message)
    {
        Logger.debug('Missing messages handler function.', message);
    }

    async onAuth(client, options, request)
    {
        if(!options){
            return false;
        }
        let loginResult = await this.loginManager.processUserRequest(options);
        if(sc.hasOwn(loginResult, 'error')){
            // @TODO - BETA - Improve login errors, use send message with type and here just return false.
            ErrorManager.error(loginResult.error);
        }
        if(sc.hasOwn(options, 'selectedPlayer')){
            loginResult.selectedPlayer = options.selectedPlayer;
            loginResult.user.player = this.getPlayerById(loginResult.user.players, options.selectedPlayer);
        }
        let result = {confirm: true};
        await this.events.emitSync('reldens.roomLoginOnAuth', {roomLogin: this, result, loginResult, client, options, request});
        return result.confirm ? loginResult.user : false;
    }

    getPlayerById(players, playerId)
    {
        if(!sc.isArray(players) || 0 === players.length){
            return false;
        }
        for(let player of players){
            if(player.id === playerId){
                return player;
            }
        }
        return false;
    }

    validateRoom(playerRoomName)
    {
        if(
            this.config.server.rooms.validation.enabled
            && !this.config.client.rooms.selection.allowOnRegistration
            && !this.config.client.rooms.selection.allowOnLogin
        ){
            this.validRooms = this.config.server.rooms.validation.valid.split(',');
            if(-1 === this.validRooms.indexOf(this.roomName) && playerRoomName !== this.roomName){
                ErrorManager.error('Invalid player room: '+playerRoomName +'. Current room: '+this.roomName);
            }
        }
    }

    onDispose()
    {
        this.events.emitSync('reldens.onRoomDispose', {roomName: this.roomName, roomId: this.roomId});
        Logger.info('ON-DISPOSE Room: '+this.roomName);
    }

}

module.exports.RoomLogin = RoomLogin;
