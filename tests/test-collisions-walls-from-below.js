/**
 *
 * Reldens - Test Collisions Walls From Below
 *
 */

const { BaseTest } = require('./base-test');
const { CollisionsManager } = require('../lib/world/server/collisions-manager');

class TestCollisionsWallsFromBelow extends BaseTest
{

    resolveContacts(allowPassWallsFromBelow, contacts)
    {
        let collisionsManager = new CollisionsManager(null);
        collisionsManager.room = {roomWorld: {allowPassWallsFromBelow}};
        let contactEquations = contacts.map((contact) => Object.assign({enabled: true}, contact));
        collisionsManager.beforeResolveCollision({contactEquations});
        return contactEquations.map((contact) => contact.enabled);
    }

    createBodies()
    {
        return {
            playerBelow: {playerId: 'session-a', position: [560, 600]},
            playerAbove: {playerId: 'session-b', position: [560, 500]},
            platform: {isWall: true, isWorldWall: false, position: [560, 528]},
            worldBorder: {isWall: true, isWorldWall: true, position: [560, 640]}
        };
    }

    async testTheContactUnderAWallIsDisabledOnlyWithTheOptionOn()
    {
        await this.test('a player contact under a wall is disabled only with the pass walls from below option on', async () => {
            let bodies = this.createBodies();
            this.assert.deepStrictEqual(
                this.resolveContacts(true, [{bodyA: bodies.playerBelow, bodyB: bodies.platform}]),
                [false]
            );
            this.assert.deepStrictEqual(
                this.resolveContacts(true, [{bodyA: bodies.platform, bodyB: bodies.playerBelow}]),
                [false]
            );
            this.assert.deepStrictEqual(
                this.resolveContacts(true, [{bodyA: bodies.playerAbove, bodyB: bodies.platform}]),
                [true]
            );
            this.assert.deepStrictEqual(
                this.resolveContacts(false, [{bodyA: bodies.playerBelow, bodyB: bodies.platform}]),
                [true]
            );
        });
    }

    async testTheWorldBorderContactIsKept()
    {
        await this.test('a player contact with a world border is kept with the pass walls from below option on', async () => {
            let bodies = this.createBodies();
            bodies.worldBorder.position = [560, 0];
            this.assert.deepStrictEqual(
                this.resolveContacts(true, [{bodyA: bodies.playerBelow, bodyB: bodies.worldBorder}]),
                [true]
            );
        });
    }

}

module.exports.TestCollisionsWallsFromBelow = TestCollisionsWallsFromBelow;
