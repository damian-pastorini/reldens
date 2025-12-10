/**
 *
 * Reldens - JoinedSceneRoomEvent
 *
 * Event data container for player joining a scene room.
 *
 */

/**
 * @typedef {import('@colyseus/core').Client} Client
 * @typedef {import('../scene').RoomScene} RoomScene
 * @typedef {import('../../../users/server/player').Player} Player
 * @typedef {import('../../../../generated-entities/models/objection-js/users-model').UsersModel} UsersModel
 */
class JoinedSceneRoomEvent
{

    /**
     * @param {RoomScene} roomScene
     * @param {Client} client
     * @param {Object} options
     * @param {UsersModel} userModel
     * @param {Player} loggedPlayer
     * @param {boolean} isGuest
     */
    constructor(roomScene, client, options, userModel, loggedPlayer, isGuest)
    {
        /** @type {RoomScene} */
        this.roomScene = roomScene;
        /** @type {Client} */
        this.client = client;
        /** @type {Object} */
        this.options = options;
        /** @type {UsersModel} */
        this.userModel = userModel;
        /** @type {Player} */
        this.loggedPlayer = loggedPlayer;
        /** @type {boolean} */
        this.isGuest = isGuest;
    }

}

module.exports.JoinedSceneRoomEvent = JoinedSceneRoomEvent;
