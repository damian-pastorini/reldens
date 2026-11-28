/**
 *
 * Reldens - Rooms Server Validation Flag Refresher
 *
 * The rooms server validation flag (server/rooms/validateRoomOnServer) the server start reads once and passes to every
 * defined room props is set again from the current config on every defined room, like the server restart that reads it
 * again, so a validation override or restore reaches the next room instance.
 *
 */

class RoomsServerValidationFlagRefresher
{

    static apply(serverManager)
    {
        let definedRooms = serverManager.roomsManager.definedRooms;
        let validateRoomOnServer = serverManager.configManager.getWithoutLogs('server/rooms/validateRoomOnServer', true);
        for(let roomName of Object.keys(definedRooms)){
            definedRooms[roomName].roomProps.validateRoomOnServer = validateRoomOnServer;
        }
        return validateRoomOnServer;
    }

}

module.exports.RoomsServerValidationFlagRefresher = RoomsServerValidationFlagRefresher;
