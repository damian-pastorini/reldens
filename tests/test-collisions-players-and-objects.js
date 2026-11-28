/**
 *
 * Reldens - Test Collisions Players And Objects
 *
 * Tests the players contacts with the objects and the other players: a passive NPC hitting a player without messages
 * nor battle and the player path recalculated, the player stopped on an object contact end unless a listener keeps it
 * moving, an object with no collision response (a dead enemy waiting its respawn) running its hit but never re-pathing
 * or stopping a pointer walk while a responding object re-paths and stops it, a pointer path on its last step keeping
 * its target on an object hit, and both players stopped on their contact end.
 *
 */

const { CollisionsBaseTest } = require('./fixtures/collisions-base-test');
const { AnimationObject } = require('../lib/objects/server/object/type/animation-object');
const { WorldConst } = require('../lib/world/constants');

class TestCollisionsPlayersAndObjects extends CollisionsBaseTest
{

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
            let npcBody = this.bodyBuilder.buildWithShape(WorldConst.COLLISIONS.OBJECT);
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

    async testAnObjectWithNoCollisionResponseKeepsThePointerWalk()
    {
        await this.test('a pointer walk hitting an object with no collision response runs its hit and keeps its path and speed, a responding object re-paths and stops it', async () => {
            let walks = [];
            let targetTile = [this.originalTile + 3, this.originalTile];
            for(let collisionResponse of [false, true]){
                let setup = this.createCollisionsSetup({});
                let objectBody = Object.assign(this.createRoomObjectBody(setup, 'dead-enemy'), {collisionResponse});
                let playerBody = this.createPlayerBody('session-a');
                playerBody.moveToPoint({column: targetTile[0], row: targetTile[1]});
                playerBody.autoMoving.splice(1, 1);
                playerBody.velocity = [50, 0];
                setup.collisionsManager.onCollisionsBegin({bodyA: objectBody, bodyB: playerBody});
                let path = [playerBody.autoMoving.length, [...playerBody.autoMoving].pop()];
                setup.collisionsManager.onCollisionsEnd({bodyA: playerBody, bodyB: objectBody});
                walks.push([setup.hits, path, [...playerBody.velocity], Boolean(playerBody.pStop), setup.emittedEvents]);
            }
            let events = ['reldens.startPlayerHitObjectBegin', 'reldens.endPlayerHitObjectBegin', 'reldens.playerHitObjectEnd'];
            this.assert.deepStrictEqual(walks, [
                [['dead-enemy'], [3, targetTile], [50, 0], false, events],
                [['dead-enemy'], [4, targetTile], [0, 0], true, events]
            ]);
        });
    }

    async testAPathOnItsLastStepKeepsItsTargetOnAnObjectHit()
    {
        await this.test('a pointer path on its last step keeps its target when the player hits a responding object', async () => {
            let setup = this.createCollisionsSetup({});
            let playerBody = this.createPlayerBody('session-a');
            let targetTile = [this.originalTile + 1, this.originalTile];
            playerBody.autoMoving = [targetTile];
            setup.collisionsManager.onCollisionsBegin({bodyA: this.createRoomObjectBody(setup, 'npc'), bodyB: playerBody});
            this.assert.deepStrictEqual([playerBody.autoMoving, setup.hits], [[targetTile], ['npc']]);
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

}

module.exports.TestCollisionsPlayersAndObjects = TestCollisionsPlayersAndObjects;
