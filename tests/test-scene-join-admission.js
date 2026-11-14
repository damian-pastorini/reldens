/**
 *
 * Reldens - Test Scene Join Admission
 *
 */

const timersPromises = require('timers/promises');
const { BaseTest } = require('./base-test');
const { RoomScene } = require('../lib/rooms/server/scene');
const { GameConst } = require('../lib/game/constants');
const { ChatConst } = require('../lib/chat/constants');

class TestSceneJoinAdmission extends BaseTest
{

    createSceneRoom(joinSetup)
    {
        let roomScene = Object.create(RoomScene.prototype, {roomName: {value: 'reldens-town'}});
        roomScene.validateRoomData = true;
        roomScene.disposeTimeoutTimer = joinSetup.disposeTimeoutTimer;
        roomScene.events = {emit: async (eventName) => joinSetup.emittedEvents.push(eventName)};
        roomScene.config = {
            server: {rooms: {validation: joinSetup.validation}},
            client: {rooms: {selection: {allowOnRegistration: false, allowOnLogin: false}}}
        };
        roomScene.loginManager = {
            isGuestUser: () => joinSetup.isGuest,
            roomsManager: {availableRoomsGuest: joinSetup.guestRooms},
            activePlayers: {add: () => joinSetup.activePlayers.push(true)}
        };
        roomScene.createPlayerOnScene = async () => joinSetup.createdPlayers.push(true);
        return roomScene;
    }

    async joinScene(userModel, joinOptions)
    {
        let joinSetup = Object.assign({
            emittedEvents: [],
            createdPlayers: [],
            activePlayers: [],
            disposeTimeoutTimer: {timerId: 'dispose-timer'},
            validation: {enabled: false},
            isGuest: false,
            guestRooms: {}
        }, joinOptions);
        let roomScene = this.createSceneRoom(joinSetup);
        joinSetup.joinError = await roomScene.onJoin({sessionId: 'session-a'}, {}, userModel)
            .then(() => false)
            .catch((error) => error.message);
        joinSetup.remainingTimer = roomScene.disposeTimeoutTimer;
        return joinSetup;
    }

    async testTheJoinWithoutAPlayerStateIsRejected()
    {
        await this.test('a scene join without a player state is rejected and keeps the dispose timer', async () => {
            let joinSetup = await this.joinScene({id: 1, username: 'player', related_players: []});
            this.assert.strictEqual(joinSetup.joinError, GameConst.JOIN_GAME_ERROR_MESSAGE);
            this.assert.strictEqual(joinSetup.createdPlayers.length, 0);
            this.assert.deepStrictEqual(joinSetup.remainingTimer, {timerId: 'dispose-timer'});
        });
    }

    async testTheJoinWithThePlayerInAnotherSceneIsRejected()
    {
        await this.test('a scene join for a player whose state is in another scene is rejected', async () => {
            let joinSetup = await this.joinScene({
                id: 1,
                username: 'player',
                player: {id: 7, state: {scene: 'reldens-forest'}}
            });
            this.assert.strictEqual(joinSetup.joinError, GameConst.JOIN_GAME_ERROR_MESSAGE);
            this.assert.strictEqual(joinSetup.createdPlayers.length, 0);
            this.assert.strictEqual(-1 !== joinSetup.emittedEvents.indexOf('reldens.joinRoomInvalid'), true);
            this.assert.deepStrictEqual(joinSetup.remainingTimer, {timerId: 'dispose-timer'});
        });
    }

    async testTheGuestJoinOutsideTheGuestRoomsIsRejected()
    {
        await this.test('a guest join to a room outside the guest rooms is rejected by the rooms validation', async () => {
            let joinSetup = await this.joinScene(
                {id: 1, username: 'guest', player: {id: 7, state: {scene: 'reldens-town'}}},
                {isGuest: true, guestRooms: {forest: {roomName: 'reldens-forest'}}}
            );
            this.assert.strictEqual(joinSetup.joinError, GameConst.JOIN_GAME_ERROR_MESSAGE);
            this.assert.strictEqual(joinSetup.createdPlayers.length, 0);
            this.assert.strictEqual(joinSetup.activePlayers.length, 0);
            this.assert.deepStrictEqual(
                joinSetup.emittedEvents.filter((eventName) => 'reldens.joinRoomInvalid' === eventName),
                ['reldens.joinRoomInvalid']
            );
            this.assert.deepStrictEqual(joinSetup.remainingTimer, {timerId: 'dispose-timer'});
        });
    }

    async testTheJoinOnTheSavedRoomIsAdmitted()
    {
        await this.test('a player or guest join to its saved room is admitted and clears the dispose timer', async () => {
            let validRoomsJoin = {validation: {enabled: true, valid: 'reldens-town'}};
            let guestJoin = {isGuest: true, guestRooms: {town: {roomName: 'reldens-town'}}};
            for(let joinOptions of [{}, validRoomsJoin, guestJoin]){
                let joinSetup = await this.joinScene(
                    {id: 1, username: 'player', player: {id: 7, state: {scene: 'reldens-town'}}},
                    joinOptions
                );
                this.assert.strictEqual(joinSetup.joinError, false);
                this.assert.strictEqual(joinSetup.createdPlayers.length, 1);
                this.assert.strictEqual(joinSetup.activePlayers.length, 1);
                this.assert.deepStrictEqual(joinSetup.emittedEvents, ['reldens.joinRoomStart', 'reldens.joinRoomEnd']);
                this.assert.strictEqual(joinSetup.remainingTimer, false);
            }
        });
    }

    async testTheSceneRoomIsNotCreatedWhileTheServerIsOverloaded()
    {
        await this.test('a scene room is not created while the server is overloaded', async () => {
            let roomScene = Object.create(RoomScene.prototype, {roomName: {value: 'reldens-bots-forest'}});
            let creatingInstances = {};
            await this.assert.rejects(
                roomScene.onCreate({roomsManager: {creatingInstances}, serverHealthMonitor: {isBlocking: true}}),
                {message: GameConst.SERVER_BUSY_MESSAGE}
            );
            this.assert.deepStrictEqual(creatingInstances, {});
        });
    }

    createLeavingSceneRoom(remainingClients, disposedRooms)
    {
        let roomScene = Object.create(RoomScene.prototype, {roomName: {value: 'reldens-house-1'}});
        roomScene.disposeTimeoutMs = 30;
        roomScene.disposeTimeoutTimer = false;
        roomScene.playersLastStateTimers = {};
        roomScene.clients = remainingClients;
        roomScene.playerBySessionIdFromState = (sessionId) => ({player_id: 7, sessionId});
        roomScene.savePlayedTime = async () => true;
        roomScene.savePlayerStats = async () => true;
        roomScene.savePlayerState = async () => true;
        roomScene.removePlayer = async () => true;
        roomScene.removeActivePlayer = () => true;
        roomScene.disconnect = () => disposedRooms.push(remainingClients.length);
        return roomScene;
    }

    async testTheLastPlayerLeavingDisposesTheRoomAfterTheTimeout()
    {
        await this.test('the last player leaving disposes the room after the dispose timeout, a player still in it keeps it', async () => {
            let disposedRooms = [];
            let emptyRoom = this.createLeavingSceneRoom([], disposedRooms);
            let occupiedRoom = this.createLeavingSceneRoom([{sessionId: 'session-b'}], disposedRooms);
            await emptyRoom.onLeave({sessionId: 'session-a'}, true);
            await occupiedRoom.onLeave({sessionId: 'session-a'}, true);
            let disposedBeforeTheTimeout = [...disposedRooms];
            await timersPromises.setTimeout(emptyRoom.disposeTimeoutMs * 3);
            this.assert.deepStrictEqual(
                [disposedBeforeTheTimeout, disposedRooms, occupiedRoom.disposeTimeoutTimer],
                [[], [0], false]
            );
        });
    }

    async changeSceneWithAvailability(roomAvailability)
    {
        let changeSetup = {broadcasts: [], sentMessages: [], loadedRooms: [], playerBody: {isChangingScene: true}};
        let roomScene = Object.create(RoomScene.prototype, {roomName: {value: 'reldens-town'}});
        roomScene.roomsAvailability = {fetchRoomAvailability: async () => roomAvailability};
        roomScene.playerBySessionIdFromState = () => ({state: {scene: 'reldens-town'}});
        roomScene.broadcast = (type, message) => changeSetup.broadcasts.push(message);
        roomScene.loginManager = {
            roomsManager: {
                loadRoomByName: async (roomName) => {
                    changeSetup.loadedRooms.push(roomName);
                    return false;
                }
            }
        };
        await roomScene.nextSceneInitialPosition(
            {sessionId: 'session-a', send: (type, message) => changeSetup.sentMessages.push(message)},
            {prev: 'reldens-town', next: 'reldens-bots-forest'},
            changeSetup.playerBody
        );
        return changeSetup;
    }

    async testTheSceneChangeToANotAvailableRoomKeepsThePlayer()
    {
        await this.test('the scene change to a not available room keeps the player and sends the reason', async () => {
            let changeSetup = await this.changeSceneWithAvailability({
                isAvailable: false,
                reason: GameConst.ROOM_UNAVAILABLE.SERVER_BUSY
            });
            this.assert.strictEqual(changeSetup.broadcasts.length, 0);
            this.assert.deepStrictEqual(changeSetup.loadedRooms, []);
            this.assert.strictEqual(changeSetup.playerBody.isChangingScene, false);
            this.assert.deepStrictEqual(changeSetup.sentMessages, [{
                [GameConst.ACTION_KEY]: ChatConst.CHAT_ACTION,
                [ChatConst.TYPES.KEY]: ChatConst.TYPES.ERROR,
                [ChatConst.MESSAGE.KEY]: GameConst.ROOM_UNAVAILABLE.SERVER_BUSY
            }]);
        });
    }

    async testTheSceneChangeToAnAvailableRoomContinues()
    {
        await this.test('the scene change to an available room continues loading the next room', async () => {
            let changeSetup = await this.changeSceneWithAvailability({isAvailable: true, reason: ''});
            this.assert.deepStrictEqual(changeSetup.loadedRooms, ['reldens-bots-forest']);
            this.assert.strictEqual(changeSetup.broadcasts.length, 0);
            this.assert.strictEqual(changeSetup.playerBody.isChangingScene, false);
            this.assert.strictEqual(changeSetup.sentMessages.length, 0);
        });
    }

}

module.exports.TestSceneJoinAdmission = TestSceneJoinAdmission;
