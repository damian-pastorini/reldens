/**
 *
 * Reldens - Test Collisions Objects And Bullets
 *
 * Tests the objects, bullets and players collisions: the hit of the bullet over an object or of the first object when
 * none has hit priority, a passive NPC hitting a player without messages nor battle and the player path recalculated,
 * the bullets removed and the moving objects path recalculated on an object hit, the stopped objects fully stopped when
 * the hit ends, the wall retries of a moving object up to its limit and then the walk back to its origin, the wall hit
 * listener keeping a bullet, the objects and players stopped by a bullet in the same broadphase pair only with
 * bulletsStopOnObject and bulletsStopOnPlayer on, the default collision masks that let the enemies bullets cross the
 * other enemies, a player wall contact (the begin listeners, the pointer path recalculated on its end or the player
 * stopped on a last step), the player stopped on an object contact end unless a listener keeps it moving, and both
 * players stopped on their contact end.
 *
 */

const { RandomMovementBaseTest } = require('./fixtures/random-movement-base-test');
const { CollisionsManager } = require('../lib/world/server/collisions-manager');
const { AnimationObject } = require('../lib/objects/server/object/type/animation-object');
const { WorldConfig } = require('../lib/rooms/server/world-config');
const { ConfigProcessor } = require('../lib/config/processor');
const { WorldConst } = require('../lib/world/constants');
const { sc } = require('@reldens/utils');

class TestCollisionsObjectsAndBullets extends RandomMovementBaseTest
{

    createCollisionsSetup(roomWorldProps)
    {
        let setup = {emittedEvents: [], removedBullets: [], hits: [], listeners: {}};
        setup.collisionsManager = new CollisionsManager(null);
        setup.collisionsManager.room = {
            events: {emit: (eventName, eventData) => {
                setup.emittedEvents.push(eventName);
                return sc.get(setup.listeners, eventName, () => true)(eventData);
            }},
            roomWorld: Object.assign({removeBulletsStateIds: []}, roomWorldProps),
            state: {removeBody: () => true}
        };
        return setup;
    }

    createBullet(setup, key, hitPriority)
    {
        return {
            key,
            isBullet: true,
            isRoomObject: true,
            hitPriority,
            roomObject: {
                onHit: () => setup.hits.push(key),
                removeBullet: (bulletBody) => setup.removedBullets.push(bulletBody.key)
            }
        };
    }

    createRoomObjectBody(setup, key)
    {
        let body = this.bodyBuilder.build();
        body.isRoomObject = true;
        body.roomObject = {onHit: () => setup.hits.push(key)};
        return body;
    }

    async testABulletHitRunsTheBulletHitAndRecalculatesTheObjectPath()
    {
        await this.test('a bullet hitting a moving object runs the bullet hit, removes it and recalculates the object path', async () => {
            let setup = this.createCollisionsSetup({});
            let movingObject = this.createRoomObjectBody(setup, 'enemy');
            let pathTile = [this.originalTile + 3, this.originalTile];
            movingObject.moveToPoint({column: pathTile[0], row: pathTile[1]});
            movingObject.autoMoving.splice(1, 1);
            let bullet = this.createBullet(setup, 'attackBullet_bullet_7', 2);
            setup.collisionsManager.objectHitObjectBegin(movingObject, bullet);
            let otherSetup = this.createCollisionsSetup({});
            otherSetup.collisionsManager.objectHitObjectBegin(
                this.createRoomObjectBody(otherSetup, 'enemy-a'),
                this.createRoomObjectBody(otherSetup, 'enemy-b')
            );
            this.assert.deepStrictEqual(
                [setup.hits, setup.removedBullets, movingObject.autoMoving.length, movingObject.autoMoving.pop(), otherSetup.hits],
                [['attackBullet_bullet_7'], ['attackBullet_bullet_7'], 4, pathTile, ['enemy-a']]
            );
        });
    }

    async testAPassiveNpcHittingAPlayerStartsNothingAndThePlayerPathIsRecalculated()
    {
        await this.test('a passive NPC on its path hitting a player sends nothing, starts no battle and the player path is recalculated', async () => {
            let setup = this.createCollisionsSetup({});
            let sentMessages = [];
            setup.collisionsManager.room.broadcast = (channel, message) => sentMessages.push(message);
            setup.collisionsManager.room.getClientById = () => ({send: (channel, message) => sentMessages.push(message)});
            let playerBody = this.bodyBuilder.build();
            playerBody.playerId = 'session-a';
            let pathTile = [this.originalTile + 3, this.originalTile];
            playerBody.moveToPoint({column: pathTile[0], row: pathTile[1]});
            playerBody.autoMoving.splice(1, 1);
            let npcBody = this.bodyBuilder.build();
            npcBody.isRoomObject = true;
            npcBody.roomObject = Object.assign(Object.create(AnimationObject.prototype), {
                key: 'people_town_1',
                runOnHit: false,
                playerVisible: true
            });
            setup.collisionsManager.onCollisionsBegin({bodyA: npcBody, bodyB: playerBody});
            this.assert.deepStrictEqual(
                [sentMessages, playerBody.autoMoving.length, playerBody.autoMoving.pop(), setup.emittedEvents],
                [[], 4, pathTile, ['reldens.startPlayerHitObjectBegin', 'reldens.endPlayerHitObjectBegin']]
            );
        });
    }

    async testTheObjectHitEndStopsOnlyTheStoppedObjects()
    {
        await this.test('the end of an object hit fully stops a stopped object, keeps a moving one and removes a bullet', async () => {
            let setup = this.createCollisionsSetup({});
            let stoppedObject = this.createRoomObjectBody(setup, 'enemy-a');
            stoppedObject.velocity = [30, 0];
            let movingObject = this.createRoomObjectBody(setup, 'enemy-b');
            movingObject.moveToPoint({column: this.originalTile + 3, row: this.originalTile});
            movingObject.velocity = [30, 0];
            setup.collisionsManager.objectHitObjectEnd(stoppedObject, movingObject);
            setup.collisionsManager.bodyFullStop(this.createBullet(setup, 'attackBullet_bullet_7', 2));
            this.assert.deepStrictEqual(
                [stoppedObject.velocity, stoppedObject.pStop, movingObject.velocity, setup.removedBullets],
                [[0, 0], true, [30, 0], ['attackBullet_bullet_7']]
            );
        });
    }

    async testTheWallRetriesEndWithTheWalkBackToTheOrigin()
    {
        await this.test('an object blocked by a wall retries its target up to the limit and then walks back to its origin', async () => {
            let setup = this.createCollisionsSetup({});
            let body = this.createRoomObjectBody(setup, 'enemy');
            body.autoMovingResetMaxRetries = 2;
            body.moveToOriginalPointWithDelay = 0;
            body.updateCurrentPoints();
            body.position[0] += 2 * this.tileSize;
            let targetTile = [this.originalTile + 5, this.originalTile];
            body.moveToPoint({column: targetTile[0], row: targetTile[1]});
            setup.collisionsManager.resetObjectAutoMove(body);
            let retry = [body.autoMovingResetRetries, [...body.autoMoving].pop()];
            setup.collisionsManager.resetObjectAutoMove(body);
            this.assert.deepStrictEqual(
                [retry, body.autoMovingResetRetries, [...body.autoMoving].pop()],
                [[1, targetTile], 0, [this.originalTile, this.originalTile]]
            );
        });
    }

    async testTheWallHitListenerCanKeepTheBullet()
    {
        await this.test('a bullet hitting a wall is removed unless a wall hit listener sets continue to false', async () => {
            let setup = this.createCollisionsSetup({});
            let removedEvent = setup.collisionsManager.objectHitWallBegin(this.createBullet(setup, 'removed_bullet_1', 2), {});
            setup.listeners['reldens.objectHitWallBegin'] = (event) => Object.assign(event, {continue: false});
            let keptEvent = setup.collisionsManager.objectHitWallBegin(this.createBullet(setup, 'kept_bullet_2', 2), {});
            this.assert.deepStrictEqual(
                [removedEvent.continue, keptEvent.continue, setup.removedBullets],
                [true, false, ['removed_bullet_1']]
            );
        });
    }

    fetchBulletPairVelocities(optionName, createBody)
    {
        let velocities = [];
        for(let isOptionOn of [true, false]){
            let setup = this.createCollisionsSetup({[optionName]: isOptionOn});
            let body = createBody(setup);
            body.velocity = [50, 0];
            let bulletBody = {isBullet: true, isRoomObject: true, removeInvalidStateBulletBody: () => true};
            setup.collisionsManager.onWorldStepStart({pairs: [body, bulletBody]});
            velocities.push([...body.velocity]);
        }
        return velocities;
    }

    async testABulletStopsTheObjectsOnlyWithTheOptionOn()
    {
        await this.test('an object in the broadphase pairs with a bullet stops only with bulletsStopOnObject on', async () => {
            this.assert.deepStrictEqual(
                this.fetchBulletPairVelocities('bulletsStopOnObject', (setup) => this.createRoomObjectBody(setup, 'enemy')),
                [[0, 0], [50, 0]]
            );
        });
    }

    createPlayerBody(playerId)
    {
        let playerBody = this.bodyBuilder.build();
        playerBody.playerId = playerId;
        return playerBody;
    }

    async testAPlayerWallContactRecalculatesThePathOrStopsTheLastStep()
    {
        await this.test('a player wall contact runs its listeners, recalculates a pointer path on its end and stops a last step', async () => {
            let setup = this.createCollisionsSetup({});
            let wall = {isWall: true};
            let pathPlayer = this.createPlayerBody('session-a');
            let targetTile = [this.originalTile + 3, this.originalTile];
            pathPlayer.moveToPoint({column: targetTile[0], row: targetTile[1]});
            setup.collisionsManager.onCollisionsBegin({bodyA: pathPlayer, bodyB: wall});
            setup.collisionsManager.onCollisionsEnd({bodyA: wall, bodyB: pathPlayer});
            let lastStepPlayer = this.createPlayerBody('session-b');
            lastStepPlayer.autoMoving = [targetTile];
            lastStepPlayer.velocity = [50, 0];
            setup.collisionsManager.onCollisionsEnd({bodyA: lastStepPlayer, bodyB: wall});
            this.assert.deepStrictEqual(
                [setup.emittedEvents, pathPlayer.autoMoving.length, [...pathPlayer.autoMoving].pop(), [...lastStepPlayer.velocity], lastStepPlayer.pStop],
                [
                    ['reldens.playerHitWallBegin', 'reldens.startPlayerHitWallEnd', 'reldens.startPlayerHitWallEnd', 'reldens.endPlayerHitWallEnd'],
                    4,
                    targetTile,
                    [0, 0],
                    true
                ]
            );
        });
    }

    async testAPlayerObjectContactEndStopsThePlayerUnlessAListenerKeepsIt()
    {
        await this.test('a player object contact end fully stops the player unless a listener sets continue to false', async () => {
            let stops = [];
            for(let keepMoving of [false, true]){
                let setup = this.createCollisionsSetup({});
                if(keepMoving){
                    setup.listeners['reldens.playerHitObjectEnd'] = (event) => Object.assign(event.result, {continue: false});
                }
                let playerBody = this.createPlayerBody('session-a');
                playerBody.velocity = [50, 0];
                setup.collisionsManager.onCollisionsEnd({bodyA: playerBody, bodyB: this.createRoomObjectBody(setup, 'npc')});
                stops.push([[...playerBody.velocity], Boolean(playerBody.pStop)]);
            }
            this.assert.deepStrictEqual(stops, [[[0, 0], true], [[50, 0], false]]);
        });
    }

    async testTwoPlayersContactEndStopsBoth()
    {
        await this.test('the end of a two players contact stops both players and runs its listeners', async () => {
            let setup = this.createCollisionsSetup({});
            let pushingPlayer = this.createPlayerBody('session-a');
            let pushedPlayer = this.createPlayerBody('session-b');
            pushingPlayer.velocity = [50, 0];
            pushedPlayer.velocity = [20, 0];
            setup.collisionsManager.onCollisionsEnd({bodyA: pushingPlayer, bodyB: pushedPlayer});
            this.assert.deepStrictEqual(
                [[...pushingPlayer.velocity], [...pushedPlayer.velocity], setup.emittedEvents],
                [[0, 0], [0, 0], ['reldens.playerHitPlayerEnd']]
            );
        });
    }

    async testABulletStopsThePlayerOnlyWithTheOptionOn()
    {
        await this.test('a player in the broadphase pairs with a bullet stops only with bulletsStopOnPlayer on', async () => {
            this.assert.deepStrictEqual(
                this.fetchBulletPairVelocities('bulletsStopOnPlayer', () => this.createPlayerBody('session-a')),
                [[0, 0], [50, 0]]
            );
        });
    }

    async testTheEnemiesBulletsCrossTheOtherEnemies()
    {
        await this.test('the default collision masks let the enemies bullets cross the enemies and every bullet cross the drops', async () => {
            let config = Object.assign(new ConfigProcessor(), {avoidLog: true, server: {rooms: {world: {}}}});
            let room = {customData: {}};
            WorldConfig.mapWorldConfigValues(room, config);
            let masks = room.worldConfig.collisionsGroupsByType;
            let collisions = WorldConst.COLLISIONS;
            let collides = (groupA, groupB) => 0 !== (groupA & masks[groupB]) && 0 !== (groupB & masks[groupA]);
            this.assert.deepStrictEqual(
                [
                    collides(collisions.BULLET_OBJECT, collisions.OBJECT),
                    collides(collisions.BULLET_OBJECT, collisions.PLAYER),
                    collides(collisions.BULLET_PLAYER, collisions.OBJECT),
                    collides(collisions.BULLET_PLAYER, collisions.DROP),
                    collides(collisions.BULLET_OBJECT, collisions.DROP),
                    collides(collisions.PLAYER, collisions.DROP)
                ],
                [false, true, true, false, false, true]
            );
        });
    }

}

module.exports.TestCollisionsObjectsAndBullets = TestCollisionsObjectsAndBullets;
