/**
 *
 * Reldens - JoinedSceneRoomEvent
 *
 */

class JoinedSceneRoomEvent
{

    constructor(roomScene, client, options, userModel, loggedPlayer, isGuest)
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
        /** @type boolean **/
        this.isGuest = isGuest;
    }

}

module.exports.JoinedSceneRoomEvent = JoinedSceneRoomEvent;
