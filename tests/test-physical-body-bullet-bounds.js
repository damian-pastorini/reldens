/**
 *
 * Reldens - Test Physical Body Bullet Bounds
 *
 * Tests the removal of an invalid bullet body: a bullet outside the world bounds on any side is queued for the world
 * removal with its state id, a bullet inside the bounds or on their edges is kept, a bullet without state id is only
 * queued in the world, a body that is not a bullet is never queued, and a stopped bullet or a bullet slower than the
 * threshold of its shot speed is stopped and removed unless the speed threshold on bullets is off.
 *
 */

const { BaseTest } = require('./base-test');
const { PhysicalBody } = require('../lib/world/server/physical-body');

class TestPhysicalBodyBulletBounds extends BaseTest
{

    static TILE_SIZE = 32;
    static MAP_COLUMNS = 10;
    static MAP_ROWS = 8;
    static STATE_ID = 'attackBullet_bullet_7';
    static FLYING_SPEED = [300, 40];

    createBullet(position, bodyOptions, bulletProperties)
    {
        let body = new PhysicalBody(bodyOptions);
        Object.assign(body, {isBullet: true, bodyStateId: TestPhysicalBodyBulletBounds.STATE_ID}, bulletProperties);
        body.position = position;
        body.velocity = [...TestPhysicalBodyBulletBounds.FLYING_SPEED];
        body.originalSpeed = {x: TestPhysicalBodyBulletBounds.FLYING_SPEED[0], y: TestPhysicalBodyBulletBounds.FLYING_SPEED[1]};
        body.world = {
            mapJson: {
                tilewidth: TestPhysicalBodyBulletBounds.TILE_SIZE,
                tileheight: TestPhysicalBodyBulletBounds.TILE_SIZE,
                width: TestPhysicalBodyBulletBounds.MAP_COLUMNS,
                height: TestPhysicalBodyBulletBounds.MAP_ROWS
            },
            removeBodies: [],
            removeBulletsStateIds: []
        };
        return body;
    }

    readRemoval(body)
    {
        body.removeInvalidStateBulletBody();
        return [body.world.removeBodies.includes(body), body.world.removeBulletsStateIds];
    }

    async testABulletOutsideTheWorldBoundsIsRemoved()
    {
        await this.test('a bullet outside the world bounds on any side is removed with its state id', async () => {
            let mapWidth = TestPhysicalBodyBulletBounds.MAP_COLUMNS * TestPhysicalBodyBulletBounds.TILE_SIZE;
            let mapHeight = TestPhysicalBodyBulletBounds.MAP_ROWS * TestPhysicalBodyBulletBounds.TILE_SIZE;
            for(let position of [[-1, 100], [mapWidth + 1, 100], [100, -1], [100, mapHeight + 1]]){
                this.assert.deepStrictEqual(
                    this.readRemoval(this.createBullet(position, {}, {})),
                    [true, [TestPhysicalBodyBulletBounds.STATE_ID]]
                );
            }
        });
    }

    async testABulletInsideTheWorldBoundsIsKept()
    {
        await this.test('a flying bullet inside the world bounds or on their edges is kept', async () => {
            let mapWidth = TestPhysicalBodyBulletBounds.MAP_COLUMNS * TestPhysicalBodyBulletBounds.TILE_SIZE;
            let mapHeight = TestPhysicalBodyBulletBounds.MAP_ROWS * TestPhysicalBodyBulletBounds.TILE_SIZE;
            for(let position of [[0, 0], [mapWidth, mapHeight], [160, 128]]){
                this.assert.deepStrictEqual(this.readRemoval(this.createBullet(position, {}, {})), [false, []]);
            }
        });
    }

    async testTheRemovalWithoutStateIdAndForOtherBodies()
    {
        await this.test('a bullet without state id is only queued and a body that is not a bullet is never queued', async () => {
            this.assert.deepStrictEqual(this.readRemoval(this.createBullet([-1, 100], {}, {bodyStateId: false})), [true, []]);
            this.assert.deepStrictEqual(this.readRemoval(this.createBullet([-1, 100], {}, {isBullet: false})), [false, []]);
        });
    }

    async testAStoppedBulletIsRemovedUnlessTheThresholdIsOff()
    {
        await this.test('a stopped bullet is removed unless the speed threshold on bullets is off', async () => {
            let stoppedBullet = this.createBullet([160, 128], {}, {});
            stoppedBullet.velocity = [0, 0];
            this.assert.deepStrictEqual(this.readRemoval(stoppedBullet), [true, [TestPhysicalBodyBulletBounds.STATE_ID]]);
            let keptBullet = this.createBullet([160, 128], {applySpeedThresholdOnBullets: false}, {});
            keptBullet.velocity = [0, 0];
            this.assert.deepStrictEqual(this.readRemoval(keptBullet), [false, []]);
        });
    }

    async testASlowBulletIsStoppedAndRemovedUnlessTheThresholdIsOff()
    {
        await this.test('a bullet slower than the threshold of its shot speed is stopped and removed unless the threshold is off', async () => {
            let slowBullet = this.createBullet([160, 128], {}, {});
            slowBullet.velocity = [20, 3];
            this.assert.deepStrictEqual(
                [this.readRemoval(slowBullet), slowBullet.velocity],
                [[true, [TestPhysicalBodyBulletBounds.STATE_ID]], [0, 0]]
            );
            let flyingBullet = this.createBullet([160, 128], {applySpeedThresholdOnBullets: false}, {});
            flyingBullet.velocity = [20, 3];
            this.assert.deepStrictEqual([this.readRemoval(flyingBullet), flyingBullet.velocity], [[false, []], [20, 3]]);
        });
    }

}

module.exports.TestPhysicalBodyBulletBounds = TestPhysicalBodyBulletBounds;
