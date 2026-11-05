/**
 *
 * Reldens - Test Objects Manager Random Movement
 *
 */

const { Body } = require('p2');
const { RandomMovementBaseTest } = require('./fixtures/random-movement-base-test');
const { ObjectRandomMovement } = require('../lib/objects/server/object/object-random-movement');
const { ObjectsManager } = require('../lib/objects/server/manager');

class TestObjectsManagerRandomMovement extends RandomMovementBaseTest
{

    async testManagerResumesTheMovementOfTheRemovedPlayerDialogs()
    {
        await this.test('the objects manager closes the dialogs of a removed player on every room object', async () => {
            let objectsManager = new ObjectsManager({config: {}, events: {}, dataServer: {}});
            let randomMovement = new ObjectRandomMovement({
                objectBody: this.bodyBuilder.build(),
                getInBattlePlayers: () => ({})
            });
            randomMovement.pauseForInteraction('session-a');
            objectsManager.roomObjects = {'ground-npc-1': {randomMovementBehavior: randomMovement}, 'ground-npc-2': {}};
            objectsManager.resumeObjectsMovementAfterInteraction('session-a');
            this.assert.deepStrictEqual(randomMovement.openDialogs, {});
        });
    }

    async testManagerStartsTheMovementOnlyForConfiguredObjects()
    {
        await this.test('the objects manager starts the random movement only for objects with the config', async () => {
            let objectsManager = new ObjectsManager({config: {}, events: {}, dataServer: {}});
            let body = this.bodyBuilder.build();
            this.assert.strictEqual(objectsManager.startObjectRandomMovement({key: 'static_npc'}, body), false);
            let movingObject = {key: 'moving_npc', randomMovement: {maxTiles: 5}};
            let randomMovement = objectsManager.startObjectRandomMovement(movingObject, body);
            randomMovement.stop();
            this.assert.strictEqual(randomMovement.maxTiles, 5);
            this.assert.strictEqual(movingObject.randomMovementBehavior, randomMovement);
        });
    }

    async testManagerSetsTheOriginalTileWhenTheMovementStarts()
    {
        await this.test('the objects manager sets the body original tile to the tile the body was created on', async () => {
            let body = this.bodyBuilder.build();
            let objectsManager = new ObjectsManager({config: {}, events: {}, dataServer: {}});
            objectsManager.startObjectRandomMovement({key: 'moving_npc', randomMovement: {}}, body).stop();
            this.assert.deepStrictEqual([body.originalCol, body.originalRow], [this.originalTile, this.originalTile]);
        });
    }

    async testManagerDoesNotStartTheMovementWithoutABodyState()
    {
        await this.test('the objects manager does not start the random movement on a body without state', async () => {
            let movingObject = {key: 'npc_without_state', randomMovement: {maxTiles: 5}};
            let plainBody = new Body({mass: 0, position: [0, 0], type: Body.STATIC});
            let objectsManager = new ObjectsManager({config: {}, events: {}, dataServer: {}});
            this.assert.strictEqual(objectsManager.startObjectRandomMovement(movingObject, plainBody), false);
        });
    }

    async testManagerAddsTheObjectsWithStateToTheRoomState()
    {
        await this.test('the objects with a body state are added to the room state once, with their key', async () => {
            let objectsManager = new ObjectsManager({config: {}, events: {}, dataServer: {}});
            let movingNpcState = {x: 1, y: 1};
            let respawnedEnemyState = {x: 2, y: 2};
            objectsManager.roomObjects = {
                'ground-npc-1': {key: 'moving_npc', hasState: true, state: movingNpcState},
                'ground-npc-2': {key: 'static_npc', hasState: false, state: null},
                'respawn-enemy-1': {key: 'respawn-enemy-1', hasState: true, state: respawnedEnemyState}
            };
            let roomState = {
                bodies: new Map([['respawn-enemy-1', respawnedEnemyState]]),
                addBodyToState: (body, key) => roomState.bodies.set(key, body)
            };
            objectsManager.addStateBodiesToRoomState(roomState);
            this.assert.deepStrictEqual(
                [...roomState.bodies.entries()],
                [['respawn-enemy-1', respawnedEnemyState], ['moving_npc', movingNpcState]]
            );
        });
    }

}

module.exports.TestObjectsManagerRandomMovement = TestObjectsManagerRandomMovement;
