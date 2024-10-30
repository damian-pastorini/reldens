/**
 *
 * Reldens - RoomLogin
 *
 * Extend this room to get authenticated rooms.
 *
 */

const { Room } = require('colyseus');
const { RoomsConst } = require('../constants');
const { ErrorManager, Logger, sc } = require('@reldens/utils');

class RoomLogin extends Room
{

    onCreate(options)
    {
        if(options.roomsManager.creatingInstances[this.roomName]){
            ErrorManager.error(RoomsConst.ERRORS.CREATING_ROOM_AWAIT);
        }
        options.roomsManager.creatingInstances[this.roomName] = true;
        this.roomType = RoomsConst.ROOM_TYPE_LOGIN;
        this.events = sc.get(options, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in RoomLogin.');
        }
        this.dataServer = sc.get(options, 'dataServer', false);
        this.config = options.config;
        this.loginManager = options.loginManager;
        this.featuresManager = options.featuresManager;
        // @NOTES:
        // - The "sessionIdByUsername" property will store the session ID of the logged player in the current room.
        // - This relation is later used to disconnect the user from the room in the double-login check.
        this.sessionIdByUsername = {};
        this.validateRoomData = false;
        this.guestEmailDomain = this.config.getWithoutLogs('server/players/guestsUser/emailDomain');
        this.events.emitSync('reldens.roomLoginOnCreate', {roomLogin: this, options});
        this.onMessage('*', this.handleReceivedMessage.bind(this));
        options.roomsManager.createdInstances[this.roomId] = this;
        options.roomsManager.instanceIdByName[this.roomName] = this.roomId;
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
            loginResult.user.player = this.getPlayerByIdFromArray(loginResult.user.players, options.selectedPlayer);
        }
        let result = {confirm: true};
        await this.events.emitSync('reldens.roomLoginOnAuth', {
            roomLogin: this,
            result,
            loginResult,
            client,
            options,
            request
        });
        if(!result.confirm){
            return false;
        }
        this.sessionIdByUsername[loginResult.user.username] = client.sessionId;
        return loginResult.user;
    }

    activePlayerById(playerId)
    {
        return this.loginManager.activePlayers.playersByPlayerId[playerId];
    }

    activePlayerBySessionId(sessionId)
    {
        return this.loginManager.activePlayers.fetchBySessionId(sessionId);
    }

    activePlayerByName(playerName)
    {
        return this.loginManager.activePlayers.fetchByName(playerName);
    }

    activePlayerByRoomAndId(roomId, playerId)
    {
        return this.loginManager.activePlayers.fetchByRoomAndId(roomId, playerId);
    }

    async handleReceivedMessage(client, message)
    {
        Logger.debug('Missing messages handler function.', message);
    }

    getPlayerByIdFromArray(players, playerId)
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

    validateRoom(playerRoomName, isGuest, isChangePointHit)
    {
        if(
            this.config.server.rooms.validation.enabled
            && !this.config.client.rooms.selection.allowOnRegistration
            && !this.config.client.rooms.selection.allowOnLogin
            && !isChangePointHit
        ){
            this.validRooms = this.config.server.rooms.validation.valid.split(',');
            if(-1 === this.validRooms.indexOf(this.roomName) && playerRoomName !== this.roomName){
                Logger.error('Invalid player room: '+playerRoomName +'. Current room: '+this.roomName);
                return false;
            }
        }
        if(isGuest){
            for(let i of Object.keys(this.loginManager.roomsManager.availableRoomsGuest)){
                let room = this.loginManager.roomsManager.availableRoomsGuest[i];
                if(room.roomName === playerRoomName){
                    return true;
                }
            }
            Logger.error(
                'Invalid room for guest: '+playerRoomName +'. Current room: '+this.roomName,
                Object.keys(this.loginManager.roomsManager.availableRoomsGuest)
            );
            return false;
        }
        return true;
    }

    onDispose()
    {
        return new Promise((resolve, reject) => {
            let result = {confirm: true};
            let event = {roomName: this.roomName, roomId: this.roomId, result};
            try {
                this.events.emitSync('reldens.onRoomDispose', event);
                Logger.info('Disposed RoomLogin "'+this.roomName+'" (ID: '+this.roomId+').');
            } catch (error) {
                result.confirm = false;
                event.error = error;
            }
            if(result.confirm){
                return resolve(event);
            }
            return reject(event);
        });
    }

}

module.exports.RoomLogin = RoomLogin;
