/**
 *
 * Reldens - Test Scene Join Admission
 *
 */

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
            server: {rooms: {validation: {enabled: false}}},
            client: {rooms: {selection: {allowOnRegistration: false, allowOnLogin: false}}}
        };
        roomScene.loginManager = {isGuestUser: () => false};
        roomScene.createPlayerOnScene = async () => joinSetup.createdPlayers.push(true);
        return roomScene;
    }

    async joinScene(userModel)
    {
        let joinSetup = {emittedEvents: [], createdPlayers: [], disposeTimeoutTimer: {timerId: 'dispose-timer'}};
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

    async changeSceneWithAvailability(roomAvailability)
    {
        let changeSetup = {broadcasts: [], sentMessages: [], playerBody: {isChangingScene: true}};
        let roomScene = Object.create(RoomScene.prototype, {roomName: {value: 'reldens-town'}});
        roomScene.roomsAvailability = {fetchRoomAvailability: async () => roomAvailability};
        roomScene.playerBySessionIdFromState = () => ({state: {scene: 'reldens-town'}});
        roomScene.broadcast = (type, message) => changeSetup.broadcasts.push(message);
        roomScene.loginManager = {roomsManager: {loadRoomByName: async () => false}};
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
        await this.test('the scene change to an available room continues with the changing scene broadcast', async () => {
            let changeSetup = await this.changeSceneWithAvailability({isAvailable: true, reason: ''});
            this.assert.strictEqual(changeSetup.broadcasts.length, 1);
            this.assert.strictEqual([...changeSetup.broadcasts].shift().act, GameConst.CHANGING_SCENE);
            this.assert.strictEqual(changeSetup.sentMessages.length, 0);
        });
    }

}

module.exports.TestSceneJoinAdmission = TestSceneJoinAdmission;
