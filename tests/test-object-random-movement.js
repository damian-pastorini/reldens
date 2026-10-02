/**
 *
 * Reldens - Test Object Random Movement
 *
 */

const { Body } = require('p2');
const { BaseTest } = require('./base-test');
const { ObjectRandomMovement } = require('../lib/objects/server/object/object-random-movement');
const { ObjectsManager } = require('../lib/objects/server/manager');
const { NpcObject } = require('../lib/objects/server/object/type/npc-object');
const { PhysicalBody } = require('../lib/world/server/physical-body');
const { PathFinder } = require('../lib/world/server/path-finder');
const { GameConst } = require('../lib/game/constants');
const { ObjectsConst } = require('../lib/objects/constants');

class TestObjectRandomMovement extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.tileSize = 32;
        this.mapSize = 30;
        this.originalTile = 10;
        this.maxTiles = 3;
        this.targetSamples = 200;
    }

    createMovingBody()
    {
        let world = {
            mapJson: {tilewidth: this.tileSize, tileheight: this.tileSize, width: this.mapSize, height: this.mapSize},
            onlyWalkable: true,
            tryClosestPath: false
        };
        let pathFinder = new PathFinder();
        pathFinder.world = world;
        pathFinder.createGridFromMap();
        world.pathFinder = pathFinder;
        let tileCenter = this.originalTile * this.tileSize + this.tileSize / 2;
        let body = new PhysicalBody({mass: 1, position: [tileCenter, tileCenter], type: Body.DYNAMIC});
        body.world = world;
        body.bodyState = {inState: GameConst.STATUS.ACTIVE};
        return body;
    }

    createRandomMovement(body, inBattlePlayers = {})
    {
        return new ObjectRandomMovement({
            objectBody: body,
            getInBattlePlayers: () => inBattlePlayers,
            maxTiles: this.maxTiles
        });
    }

    isOutsideTheMovementArea(target)
    {
        return this.maxTiles < Math.abs(target.column - this.originalTile)
            || this.maxTiles < Math.abs(target.row - this.originalTile);
    }

    async testRandomTargetsStayAroundTheOriginalTile()
    {
        await this.test('the random targets are walkable tiles around the original tile and never the current tile', async () => {
            let randomMovement = this.createRandomMovement(this.createMovingBody());
            let invalidTargets = [];
            for(let sample = 0; sample < this.targetSamples; sample++){
                let target = randomMovement.findTargetTile();
                if(!target || this.isOutsideTheMovementArea(target)){
                    invalidTargets.push(target);
                    continue;
                }
                if(this.originalTile === target.column && this.originalTile === target.row){
                    invalidTargets.push(target);
                }
            }
            this.assert.deepStrictEqual(invalidTargets, []);
        });
    }

    async testNoTargetWhenTheSurroundingTilesAreNotWalkable()
    {
        await this.test('there is no random target when every tile around the original tile is not walkable', async () => {
            let body = this.createMovingBody();
            let firstTile = this.originalTile - this.maxTiles;
            let lastTile = this.originalTile + this.maxTiles;
            for(let column = firstTile; column <= lastTile; column++){
                this.blockColumnTiles(body.world.pathFinder.grid, column, firstTile, lastTile);
            }
            this.assert.strictEqual(this.createRandomMovement(body).findTargetTile(), false);
        });
    }

    blockColumnTiles(grid, column, firstRow, lastRow)
    {
        for(let row = firstRow; row <= lastRow; row++){
            grid.setWalkableAt(column, row, false);
        }
    }

    async testMoveToRandomTileStartsAPathInsideTheArea()
    {
        await this.test('moving to a random tile starts a path that ends inside the movement area', async () => {
            let body = this.createMovingBody();
            let path = this.createRandomMovement(body).moveToRandomTile();
            this.assert.notStrictEqual(0, body.autoMoving.length);
            let lastNode = [...path].pop();
            this.assert.strictEqual(this.isOutsideTheMovementArea({column: lastNode[0], row: lastNode[1]}), false);
        });
    }

    async testBodyDoesNotMoveWhileItIsAlreadyMoving()
    {
        await this.test('the body does not get a new random target while it is following a path', async () => {
            let body = this.createMovingBody();
            body.autoMoving = [[this.originalTile, this.originalTile + 1]];
            this.assert.strictEqual(this.createRandomMovement(body).moveToRandomTile(), false);
        });
    }

    async testBlockedPathIsDroppedForANewTarget()
    {
        await this.test('a path that kept the body on the same tile between two moves is dropped for a new target', async () => {
            let body = this.createMovingBody();
            let blockedPath = [[this.originalTile + 1, this.originalTile]];
            body.autoMoving = blockedPath;
            let randomMovement = this.createRandomMovement(body);
            this.assert.strictEqual(randomMovement.moveToRandomTile(), false);
            this.assert.strictEqual(body.autoMoving, blockedPath);
            this.assert.notStrictEqual(randomMovement.moveToRandomTile(), false);
            this.assert.notStrictEqual(body.autoMoving, blockedPath);
        });
    }

    async testProgressingPathIsKept()
    {
        await this.test('a path that moved the body to another tile between two moves is kept', async () => {
            let body = this.createMovingBody();
            let pendingPath = [[this.originalTile + 2, this.originalTile]];
            body.autoMoving = pendingPath;
            let randomMovement = this.createRandomMovement(body);
            randomMovement.moveToRandomTile();
            body.position[0] += this.tileSize;
            this.assert.strictEqual(randomMovement.moveToRandomTile(), false);
            this.assert.strictEqual(body.autoMoving, pendingPath);
        });
    }

    async testPathInBattleIsNeverDropped()
    {
        await this.test('the path of an object in battle is never dropped by the random movement', async () => {
            let body = this.createMovingBody();
            let chasePath = [[this.originalTile + 1, this.originalTile]];
            body.autoMoving = chasePath;
            let randomMovement = this.createRandomMovement(body, {1: true});
            randomMovement.moveToRandomTile();
            randomMovement.moveToRandomTile();
            this.assert.strictEqual(body.autoMoving, chasePath);
        });
    }

    async testDeadBodyDoesNotMove()
    {
        await this.test('a body that is not active does not move', async () => {
            let body = this.createMovingBody();
            body.bodyState.inState = GameConst.STATUS.DEATH;
            this.assert.strictEqual(this.createRandomMovement(body).moveToRandomTile(), false);
        });
    }

    async testBodyInBattleDoesNotMove()
    {
        await this.test('an object in battle with players does not move randomly', async () => {
            let randomMovement = this.createRandomMovement(this.createMovingBody(), {1: true});
            this.assert.strictEqual(randomMovement.moveToRandomTile(), false);
        });
    }

    async testInteractionPausesTheMovementUntilThePauseEnds()
    {
        await this.test('an object does not move randomly while a player interaction pause is active', async () => {
            let randomMovement = this.createRandomMovement(this.createMovingBody());
            randomMovement.pauseForInteraction();
            this.assert.strictEqual(randomMovement.moveToRandomTile(), false);
            randomMovement.pausedUntil = Date.now() - 1;
            this.assert.notStrictEqual(randomMovement.moveToRandomTile(), false);
        });
    }

    async testInteractionStopsThePathTheBodyIsFollowing()
    {
        await this.test('a player interaction stops the path the object body is following', async () => {
            let body = this.createMovingBody();
            body.autoMoving = [[this.originalTile, this.originalTile + 1]];
            this.createRandomMovement(body).pauseForInteraction();
            this.assert.strictEqual(body.autoMoving, false);
        });
    }

    async testMovementStopsWhenTheBodyLeftTheWorld()
    {
        await this.test('the movement loop stops when the body is no longer in the world', async () => {
            let body = this.createMovingBody();
            let randomMovement = this.createRandomMovement(body);
            body.world = null;
            randomMovement.moveAndScheduleNext();
            this.assert.strictEqual(randomMovement.movementTimer, false);
        });
    }

    async testManagerStartsTheMovementOnlyForConfiguredObjects()
    {
        await this.test('the objects manager starts the random movement only for objects with the config', async () => {
            let objectsManager = new ObjectsManager({config: {}, events: {}, dataServer: {}});
            let body = this.createMovingBody();
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
            let objectsManager = new ObjectsManager({config: {}, events: {}, dataServer: {}});
            let body = this.createMovingBody();
            objectsManager.startObjectRandomMovement({key: 'moving_npc', randomMovement: {}}, body).stop();
            this.assert.deepStrictEqual([body.originalCol, body.originalRow], [this.originalTile, this.originalTile]);
        });
    }

    async testManagerDoesNotStartTheMovementWithoutABodyState()
    {
        await this.test('the objects manager does not start the random movement on a body without state', async () => {
            let objectsManager = new ObjectsManager({config: {}, events: {}, dataServer: {}});
            let movingObject = {key: 'npc_without_state', randomMovement: {maxTiles: 5}};
            let plainBody = new Body({mass: 0, position: [0, 0], type: Body.STATIC});
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

    createInteractiveNpc()
    {
        let npc = new NpcObject({
            events: {},
            config: {get: () => this.tileSize, getWithoutLogs: (path, defaultValue) => defaultValue},
            dataServer: {},
            client_key: 'moving_npc',
            id: 1
        });
        npc.setupInteractionArea(false, this.tileSize, this.tileSize);
        return npc;
    }

    async sendInteractionFromMovedPosition(npc)
    {
        let movedPosition = this.tileSize * this.originalTile;
        let sentMessages = [];
        npc.state = {x: movedPosition, y: movedPosition};
        await npc.executeMessageActions(
            {send: (messageKey, message) => sentMessages.push(message)},
            {act: ObjectsConst.OBJECT_INTERACTION, id: npc.id},
            {},
            {state: {x: movedPosition, y: movedPosition}}
        );
        return [...sentMessages].shift();
    }

    async testMovingNpcValidatesTheInteractionAtItsCurrentPosition()
    {
        await this.test('a moving npc validates the interaction at its current body state position', async () => {
            let npc = this.createInteractiveNpc();
            npc.randomMovementBehavior = this.createRandomMovement(this.createMovingBody());
            this.assert.strictEqual((await this.sendInteractionFromMovedPosition(npc)).act, GameConst.UI);
        });
    }

    async testStaticNpcKeepsTheInteractionAreaOfItsCreationPosition()
    {
        await this.test('an npc without random movement keeps the interaction area of its creation position', async () => {
            let npc = this.createInteractiveNpc();
            this.assert.strictEqual(
                (await this.sendInteractionFromMovedPosition(npc)).act,
                GameConst.CLOSE_UI_ACTION
            );
        });
    }

}

module.exports.TestObjectRandomMovement = TestObjectRandomMovement;
