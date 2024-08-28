/**
 *
 * Reldens - JoinedSceneRoomEvent
 *
 */

class JoinedSceneRoomEvent
{

    constructor(roomScene, client, options, userModel, loggedPlayer)
    {
        /** @type {RoomScene} **/
        this.roomScene = roomScene;
        /** @type {Client} **/
        this.client = client;
        this.options = options;
        /** @type {UsersModel} */
        this.userModel = userModel;
        /** @type {Player} **/
        this.loggedPlayer = loggedPlayer;
    }

}

module.exports.JoinedSceneRoomEvent = JoinedSceneRoomEvent;
