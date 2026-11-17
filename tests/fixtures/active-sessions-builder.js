/**
 *
 * Reldens - ActiveSessionsBuilder
 *
 * Builds an isolated active players registry with a lobby, a scene and a chat room bound to it, and joins the sessions
 * of a user to those rooms with clients that record how they were closed, so the tests can follow every session a user
 * has on the server.
 *
 */

const { RoomGame } = require('../../lib/rooms/server/game');
const { RoomScene } = require('../../lib/rooms/server/scene');
const { RoomChat } = require('../../lib/chat/server/room-chat');
const { ActivePlayers } = require('../../lib/game/server/memory/active-players');

class ActiveSessionsBuilder
{

    static GAME_ROOM_ID = 'game-room';
    static SCENE_ROOM_ID = 'scene-room';
    static CHAT_ROOM_ID = 'chat-room';

    /**
     * @param {number} id
     * @param {string} username
     * @param {string} playerName
     * @returns {Object}
     */
    static createUserModel(id, username, playerName)
    {
        return {id, username, role_id: 1, related_players: [], player: {id, name: playerName, state: {room_id: 4}}};
    }

    /**
     * @returns {Object}
     */
    static createSetup()
    {
        let setup = {activePlayers: new ActivePlayers.constructor(), closedSessions: []};
        setup.activePlayers.gameRoomInstanceId = ActiveSessionsBuilder.GAME_ROOM_ID;
        setup.gameRoom = ActiveSessionsBuilder.createRoom(RoomGame, ActiveSessionsBuilder.GAME_ROOM_ID, setup);
        setup.sceneRoom = ActiveSessionsBuilder.createRoom(RoomScene, ActiveSessionsBuilder.SCENE_ROOM_ID, setup);
        setup.chatRoom = ActiveSessionsBuilder.createRoom(RoomChat, ActiveSessionsBuilder.CHAT_ROOM_ID, setup);
        return setup;
    }

    /**
     * @param {Function} roomClass
     * @param {string} roomId
     * @param {Object} setup
     * @returns {Object}
     */
    static createRoom(roomClass, roomId, setup)
    {
        let room = Object.create(roomClass.prototype, {roomId: {value: roomId}, roomName: {value: roomId}});
        room.loginManager = {activePlayers: setup.activePlayers};
        return room;
    }

    /**
     * @param {Object} setup
     * @param {string} sessionId
     * @returns {Object}
     */
    static createClient(setup, sessionId)
    {
        return {sessionId, leave: (closeCode) => setup.closedSessions.push([sessionId, closeCode])};
    }

    /**
     * @param {Object} setup
     * @param {Object} room
     * @param {string} sessionId
     * @param {Object} userModel
     * @returns {Object}
     */
    static joinRoom(setup, room, sessionId, userModel)
    {
        let client = ActiveSessionsBuilder.createClient(setup, sessionId);
        setup.activePlayers.add(userModel, client, room);
        return client;
    }

    /**
     * @param {Object} setup
     * @param {number} userId
     * @returns {Array<string>}
     */
    static fetchUserSessions(setup, userId)
    {
        return Object.keys(setup.activePlayers.playersSessionsByUserId[userId] || {});
    }

}

module.exports.ActiveSessionsBuilder = ActiveSessionsBuilder;
