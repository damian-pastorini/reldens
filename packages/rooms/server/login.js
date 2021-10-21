/**
 *
 * Reldens - RoomLogin
 *
 * This room is the base to authenticate every single client join.
 * Since we are hitting the storage to validate the client we doing it on each join.
 *
 */

const { Room } = require('colyseus');
const { ErrorManager, Logger, sc } = require('@reldens/utils');

class RoomLogin extends Room
{

    onCreate(options)
    {
        this.events = sc.getDef(options, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in RoomLogin.');
        }
        this.config = options.config;
        this.loginManager = options.loginManager;
        // @NOTE: validateRoomData is overridden in RoomScene onCreate.
        this.validateRoomData = false;
        options.roomsManager.createdInstances[this.roomId] = this;
    }

    // eslint-disable-next-line no-unused-vars
    async onAuth(client, options, request)
    {
        if(!options){
            return false;
        }
        let loginResult = await this.loginManager.processUserRequest(options);
        if(sc.hasOwn(loginResult, 'error')){
            // login error.
            ErrorManager.error(loginResult.error);
        }
        if(sc.hasOwn(options, 'selectedPlayer')){
            loginResult.selectedPlayer = options.selectedPlayer;
            loginResult.user.player = this.getPlayerById(loginResult.user.players, options.selectedPlayer);
        }
        return loginResult.user;
    }

    getPlayerById(players, playerId)
    {
        let result = false;
        for(let player of players){
            if(player.id === playerId){
                result = player;
                break;
            }
        }
        return result;
    }

    validateRoom(playerRoomName)
    {
        if(
            this.config.server.rooms.validation.enabled
            && !this.config.client.rooms.selection.allowOnRegistration
            && !this.config.client.rooms.selection.allowOnLogin
        ){
            this.validRooms = this.config.server.rooms.validation.valid.split(',');
            if(this.validRooms.indexOf(this.roomName) === -1 && playerRoomName !== this.roomName){
                ErrorManager.error(['Invalid player room:', playerRoomName, 'Current room:', this.roomName]);
            }
        }
    }

    onDispose()
    {
        Logger.info('ON-DISPOSE Room: ' + this.roomName);
    }

}

module.exports.RoomLogin = RoomLogin;
