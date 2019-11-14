/**
 *
 * Reldens - RoomLogin
 *
 * This room is the base to authenticate every single client join.
 * Since we are hitting the storage to validate the client we doing it on each join.
 *
 */

const { Room } = require('colyseus');

class RoomLogin extends Room
{

    onCreate(options)
    {
        this.config = options.config;
        this.loginManager = options.loginManager;
        this.validateRoomData = false;
    }

    // eslint-disable-next-line no-unused-vars
    async onAuth(client, options, request)
    {
        if(!options){
            return false;
        }
        let loginResult = await this.loginManager.attemptLoginOrRegister(options);
        if({}.hasOwnProperty.call(loginResult, 'error')){
            // login error.
            throw new Error(loginResult.error);
        }
        // @TODO: for now we only have one player.
        if(this.validateRoomData && !this.validateRoom(loginResult.user.players[0].state.scene)){
            // invalid room.
            throw new Error('ERROR - Invalid room data.');
        }
        return loginResult.user;
    }

    validateRoom(playerRoomName)
    {
        let isValid = true;
        if(this.config.server.rooms.validation.enabled){
            this.validRooms = this.config.server.rooms.validation.valid.split(',');
            if(this.validRooms.indexOf(this.roomName) === -1 && playerRoomName !== this.roomName){
                console.log('ERROR - Invalid player room:', playerRoomName, this.roomName);
                isValid = false;
            }
        }
        return isValid;
    }

    onDispose()
    {
        console.log('INFO - ON-DISPOSE Room:', this.roomName);
    }

}

module.exports = RoomLogin;
