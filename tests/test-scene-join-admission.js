/**
 *
 * Reldens - Test Scene Join Admission
 *
 */

const { BaseTest } = require('./base-test');
const { RoomScene } = require('../lib/rooms/server/scene');
const { GameConst } = require('../lib/game/constants');

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

}

module.exports.TestSceneJoinAdmission = TestSceneJoinAdmission;
