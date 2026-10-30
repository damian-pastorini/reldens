/**
 *
 * Reldens - RelocationRoomBuilder
 *
 * Builds a scene room stub with the methods the player relocation uses (room load by name, availability, movement
 * intervals, state position and save, broadcasts and scene change) and records every call, plus the player and the
 * client that are relocated. The player room state is the real PlayerRoomState over the stubbed rooms manager and the
 * player state replacement is the real RoomScene method. The state position applies the position on the player state
 * as the room state does, the body stops are recorded and every state save records the state it saved and the
 * broadcasts already sent at that moment.
 *
 */

const { GameplayPlayerBuilder } = require('./gameplay-player-builder');
const { PlayerRoomState } = require('../../lib/game/server/player-room-state');
const { RoomScene } = require('../../lib/rooms/server/scene');
const { GameConst } = require('../../lib/game/constants');
const { sc } = require('@reldens/utils');

class RelocationRoomBuilder
{

    constructor()
    {
        this.townRoom = {roomId: 4, roomName: 'reldens-town', returnPointDefault: {x: 400, y: 500, d: GameConst.UP}};
        this.forestRoom = {roomId: 6, roomName: 'reldens-forest', returnPointDefault: {x: 96, y: 64, d: GameConst.DOWN}};
        this.noReturnPointRoom = {roomId: 9, roomName: 'reldens-house-1'};
        this.destinationRooms = {
            [this.townRoom.roomName]: this.townRoom,
            [this.forestRoom.roomName]: this.forestRoom,
            [this.noReturnPointRoom.roomName]: this.noReturnPointRoom
        };
    }

    /**
     * @param {string} currentRoomName
     * @param {Object} [options]
     * @returns {Object}
     */
    build(currentRoomName, options = {})
    {
        let setup = {
            broadcasts: [],
            sceneChanges: [],
            positionedPlayers: [],
            clearedIntervals: [],
            loadedRooms: [],
            savedStates: 0,
            savedStateValues: [],
            broadcastsOnSave: [],
            saveResult: false !== options.saveResult,
            isRoomAvailable: false !== options.isRoomAvailable,
            validRooms: options.validRooms || Object.keys(this.destinationRooms)
        };
        setup.bodyStops = [];
        setup.playerBody = {
            isChangingScene: Boolean(options.isChangingScene),
            position: [10, 20],
            aabbNeedsUpdate: false,
            resetAuto: () => setup.bodyStops.push('resetAuto'),
            stopFull: () => setup.bodyStops.push('stopFull')
        };
        setup.playerSchema = GameplayPlayerBuilder.createPlayerSchema({
            physicalBody: false !== options.withBody ? setup.playerBody : false,
            inState: sc.get(options, 'inState', GameConst.STATUS.ACTIVE)
        });
        setup.playerSchema.state = {scene: currentRoomName, room_id: 1, x: 10, y: 20, dir: GameConst.DOWN};
        setup.client = {sessionId: 'session-7', auth: {role_id: 1}, sentMessages: []};
        setup.client.send = (messageKey, message) => setup.client.sentMessages.push(message);
        let roomsManager = {
            loadRoomByName: async (roomName) => {
                setup.loadedRooms.push(roomName);
                return this.destinationRooms[roomName] || false;
            }
        };
        setup.room = {
            roomName: currentRoomName,
            loginManager: {
                roomsManager,
                isGuestUser: () => false,
                playerRoomState: new PlayerRoomState({config: {get: (path, value) => value}, roomsManager})
            },
            validateRoom: (roomName) => -1 !== setup.validRooms.indexOf(roomName),
            isNextRoomAvailable: async (client, roomName, playerBody) => {
                if(setup.isRoomAvailable){
                    return true;
                }
                playerBody.isChangingScene = false;
                return false;
            },
            clearMovementIntervals: (playerId) => setup.clearedIntervals.push(playerId),
            state: {
                positionPlayer: (id, data) => {
                    setup.positionedPlayers.push({id, x: data.x, y: data.y});
                    setup.playerSchema.state.mov = false;
                    setup.playerSchema.state.x = data.x;
                    setup.playerSchema.state.y = data.y;
                }
            },
            replacePlayerState: RoomScene.prototype.replacePlayerState,
            savePlayerState: async () => {
                setup.savedStates++;
                setup.savedStateValues.push(Object.assign({}, setup.playerSchema.state));
                setup.broadcastsOnSave.push(setup.broadcasts.length);
                return setup.saveResult ? setup.playerSchema : false;
            },
            broadcast: (messageKey, message) => setup.broadcasts.push(message),
            broadcastSceneChange: (client, playerSchema, data) => setup.sceneChanges.push({
                scene: playerSchema.state.scene,
                prev: data.prev
            })
        };
        return setup;
    }

}

module.exports.RelocationRoomBuilder = RelocationRoomBuilder;
