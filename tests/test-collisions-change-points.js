/**
 *
 * Reldens - Test Collisions Change Points
 *
 */

const { BaseTest } = require('./base-test');
const { CollisionsManager } = require('../lib/world/server/collisions-manager');

class TestCollisionsChangePoints extends BaseTest
{

    createContactSetup(contactOptions)
    {
        let setup = Object.assign({
            emittedEvents: [],
            validatedRooms: [],
            positions: [],
            sceneChanges: [],
            resetAutoCalls: 0,
            isGuest: false,
            roomAllowed: true,
            playerSchema: {state: {scene: 'reldens-town'}},
            client: {sessionId: 'session-a', auth: {username: 'player'}},
            changePoint: {changeScenePoint: 'reldens-house-1'}
        }, contactOptions);
        setup.playerBody = {
            playerId: 'session-a',
            isChangingScene: false,
            position: [320, 480],
            resetAuto: () => setup.resetAutoCalls++
        };
        setup.collisionsManager = new CollisionsManager(null);
        setup.collisionsManager.room = {
            events: {emit: (eventName) => setup.emittedEvents.push(eventName)},
            playerBySessionIdFromState: () => setup.playerSchema,
            getClientById: () => setup.client,
            loginManager: {isGuestUser: () => setup.isGuest},
            validateRoom: (roomName, isGuest, isChangePointHit) => {
                setup.validatedRooms.push([roomName, isGuest, isChangePointHit]);
                return setup.roomAllowed;
            },
            state: {positionPlayer: (playerId, position) => setup.positions.push({playerId, position})},
            nextSceneInitialPosition: async (client, changeData, playerBody) => setup.sceneChanges.push({
                sessionId: client.sessionId,
                changeData,
                isChangingScene: playerBody.isChangingScene
            })
        };
        return setup;
    }

    async testTheFirstContactStartsTheSceneChange()
    {
        await this.test('a change point contact saves the position and starts the scene change once', async () => {
            let setup = this.createContactSetup({});
            setup.collisionsManager.playerHitChangePointBegin(setup.playerBody, setup.changePoint);
            this.assert.strictEqual(setup.playerBody.isChangingScene, true);
            this.assert.deepStrictEqual(setup.validatedRooms, [['reldens-house-1', false, true]]);
            this.assert.deepStrictEqual(setup.positions, [{playerId: 'session-a', position: {x: 320, y: 480}}]);
            this.assert.deepStrictEqual(setup.sceneChanges, [{
                sessionId: 'session-a',
                changeData: {prev: 'reldens-town', next: 'reldens-house-1'},
                isChangingScene: true
            }]);
            this.assert.deepStrictEqual(
                setup.emittedEvents,
                ['reldens.startPlayerHitChangePoint', 'reldens.endPlayerHitChangePoint']
            );
            this.assert.strictEqual(setup.resetAutoCalls, 1);
        });
    }

    async testTheSecondContactWhileChangingSceneIsIgnored()
    {
        await this.test('a second change point contact while changing scene starts no second scene change', async () => {
            let setup = this.createContactSetup({});
            setup.collisionsManager.playerHitChangePointBegin(setup.playerBody, setup.changePoint);
            this.assert.strictEqual(
                setup.collisionsManager.playerHitChangePointBegin(setup.playerBody, {changeScenePoint: 'reldens-house-2'}),
                false
            );
            this.assert.strictEqual(setup.playerBody.isChangingScene, true);
            this.assert.strictEqual(setup.sceneChanges.length, 1);
            this.assert.strictEqual(setup.positions.length, 1);
            this.assert.strictEqual(setup.validatedRooms.length, 1);
            this.assert.deepStrictEqual(setup.emittedEvents, [
                'reldens.startPlayerHitChangePoint',
                'reldens.endPlayerHitChangePoint',
                'reldens.startPlayerHitChangePoint'
            ]);
            this.assert.strictEqual(setup.resetAutoCalls, 2);
        });
    }

    async testTheGuestContactToANotAllowedRoomIsRejected()
    {
        await this.test('a guest change point contact to a room not allowed to guests keeps the player', async () => {
            let setup = this.createContactSetup({isGuest: true, roomAllowed: false});
            this.assert.strictEqual(
                setup.collisionsManager.playerHitChangePointBegin(setup.playerBody, setup.changePoint),
                false
            );
            this.assert.strictEqual(setup.playerBody.isChangingScene, false);
            this.assert.deepStrictEqual(setup.validatedRooms, [['reldens-house-1', true, true]]);
            this.assert.deepStrictEqual(setup.positions, []);
            this.assert.deepStrictEqual(setup.sceneChanges, []);
            this.assert.deepStrictEqual(
                setup.emittedEvents,
                ['reldens.startPlayerHitChangePoint', 'reldens.guestInvalidChangePoint']
            );
        });
    }

}

module.exports.TestCollisionsChangePoints = TestCollisionsChangePoints;
