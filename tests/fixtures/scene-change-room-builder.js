/**
 *
 * Reldens - SceneChangeRoomBuilder
 *
 * Builds a RoomScene over its real prototype for the change points flow, so the real scene change, return point,
 * state save and scene change broadcast methods run over a stubbed rooms manager, users manager, events, world and
 * client that record every call. The state save resolves the given result or rejects, a save listener can skip the
 * save, and every save records the broadcasts already sent at that moment.
 *
 */

const { GameplayPlayerBuilder } = require('./gameplay-player-builder');
const { RoomScene } = require('../../lib/rooms/server/scene');
const { GameConst } = require('../../lib/game/constants');
const { sc } = require('@reldens/utils');

class SceneChangeRoomBuilder
{

    constructor()
    {
        this.currentRoomName = 'reldens-house-1';
        this.otherPreviousRoomName = 'reldens-house-2';
        this.townRoom = {
            roomId: 4,
            roomName: 'reldens-town',
            returnPoints: [
                {d: GameConst.DOWN, x: 400, y: 345, p: this.otherPreviousRoomName},
                {d: GameConst.UP, x: 640, y: 600, p: this.currentRoomName}
            ]
        };
        this.forestRoom = {roomId: 6, roomName: 'reldens-forest', returnPoints: [{d: GameConst.LEFT, x: 96, y: 64}]};
        this.noReturnPointsRoom = {roomId: 7, roomName: 'reldens-cave', returnPoints: []};
        this.otherPathRoom = {
            roomId: 8,
            roomName: 'reldens-bots',
            returnPoints: [{d: GameConst.UP, x: 1, y: 2, p: this.otherPreviousRoomName}]
        };
        this.nextRooms = {};
        for(let room of [this.townRoom, this.forestRoom, this.noReturnPointsRoom, this.otherPathRoom]){
            this.nextRooms[room.roomName] = room;
        }
    }

    /**
     * @param {Object} [options]
     * @returns {Object}
     */
    build(options = {})
    {
        let setup = {
            broadcasts: [],
            savedPatches: [],
            loadedRooms: [],
            removedBodies: [],
            broadcastsOnSave: [],
            saveResult: sc.get(options, 'saveResult', true),
            playerBody: {isChangingScene: true}
        };
        setup.playerSchema = GameplayPlayerBuilder.createPlayerSchema({physicalBody: setup.playerBody});
        setup.playerSchema.playerName = 'player-7';
        setup.playerSchema.playedTime = 120;
        setup.playerSchema.state = {scene: this.currentRoomName, room_id: 5, x: 100, y: 200, dir: GameConst.LEFT};
        setup.initialState = Object.assign({}, setup.playerSchema.state);
        setup.client = GameplayPlayerBuilder.createClient(setup.playerSchema.sessionId);
        let room = Object.create(RoomScene.prototype, {roomName: {value: this.currentRoomName}});
        room.playerBySessionIdFromState = (sessionId) => {
            if(false === sc.get(options, 'withPlayer', true)){
                return false;
            }
            return setup.client.sessionId === sessionId ? setup.playerSchema : false;
        };
        room.loginManager = {
            roomsManager: {
                loadRoomByName: async (roomName) => {
                    setup.loadedRooms.push(roomName);
                    return sc.get(this.nextRooms, roomName, false);
                }
            },
            usersManager: {
                updateUserStateByPlayerId: async (playerId, patch) => {
                    setup.savedPatches.push({playerId, patch});
                    setup.broadcastsOnSave.push(setup.broadcasts.length);
                    if(sc.get(options, 'saveRejects', false)){
                        return Promise.reject({message: 'Storage.'});
                    }
                    return setup.saveResult;
                }
            }
        };
        room.events = {
            emitSync: (eventName, eventData) => {
                if(sc.get(options, 'skipSave', false)){
                    eventData.updateReady.continueUpdate = false;
                }
            }
        };
        room.broadcast = (messageKey, message) => setup.broadcasts.push(message);
        room.config = {
            getWithoutLogs: (path, defaultValue) => sc.get(options, 'showPlayedTime', defaultValue)
        };
        room.roomWorld = {removeBody: (body) => setup.removedBodies.push(body)};
        setup.room = room;
        return setup;
    }

}

module.exports.SceneChangeRoomBuilder = SceneChangeRoomBuilder;
