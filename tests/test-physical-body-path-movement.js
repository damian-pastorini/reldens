/**
 *
 * Reldens - Test Physical Body Path Movement
 *
 * Tests the path movement of a body on a real path finder grid: a target on a blocked tile or a body without path
 * finder stops the body and restores its collision group, the walk back to the original tile with the objects
 * collisions disabled or not on return and the group restored on arrival, a chase with the objects collisions disabled
 * or not on chase, the return delay, the movement area check and a path with a missing first point.
 *
 */

const { RandomMovementBaseTest } = require('./fixtures/random-movement-base-test');
const { ScheduledTimeouts } = require('./fixtures/scheduled-timeouts');
const { AnimationObject } = require('../lib/objects/server/object/type/animation-object');
const { WorldConst } = require('../lib/world/constants');

class TestPhysicalBodyPathMovement extends RandomMovementBaseTest
{

    constructor(config)
    {
        super(config);
        this.objectGroup = WorldConst.COLLISIONS.OBJECT;
        this.movingVelocity = [50, 0];
    }

    buildMovingBody()
    {
        let body = this.bodyBuilder.buildWithShape(this.objectGroup);
        body.velocity = [...this.movingVelocity];
        body.setShapesCollisionGroup(0);
        return body;
    }

    buildReturningBody(disableObjectsCollisionsOnReturn, moveToOriginalPointWithDelay)
    {
        let body = this.bodyBuilder.buildWithShape(this.objectGroup);
        body.updateCurrentPoints();
        body.position[0] += 2 * this.tileSize;
        body.velocity = [...this.movingVelocity];
        body.disableObjectsCollisionsOnReturn = disableObjectsCollisionsOnReturn;
        body.moveToOriginalPointWithDelay = moveToOriginalPointWithDelay;
        return body;
    }

    async testATargetOnABlockedTileStopsTheBody()
    {
        await this.test('a target on a blocked tile or a body without path finder stops the path and restores the group', async () => {
            let blockedTargetBody = this.buildMovingBody();
            let blockedTile = this.originalTile + 2;
            blockedTargetBody.world.pathFinder.grid.setWalkableAt(blockedTile, this.originalTile, false);
            let blockedResult = blockedTargetBody.moveToPoint({column: blockedTile, row: this.originalTile});
            let withoutPathFinderBody = this.buildMovingBody();
            withoutPathFinderBody.world.pathFinder = false;
            let withoutPathFinderResult = withoutPathFinderBody.moveToPoint({column: blockedTile, row: this.originalTile});
            this.assert.deepStrictEqual(
                [
                    blockedResult,
                    blockedTargetBody.velocity,
                    blockedTargetBody.shapes[0].collisionGroup,
                    blockedTargetBody.autoMoving,
                    withoutPathFinderResult,
                    withoutPathFinderBody.shapes[0].collisionGroup
                ],
                [false, [0, 0], this.objectGroup, false, false, this.objectGroup]
            );
        });
    }

    async testTheReturnDisablesTheObjectsCollisionsUntilTheArrival()
    {
        await this.test('the walk back to the origin crosses objects with the collisions off on return and restores them on arrival', async () => {
            let returningBody = this.buildReturningBody(true, 0);
            returningBody.moveToOriginalPoint();
            let returningGroup = returningBody.shapes[0].collisionGroup;
            let returningPath = [...returningBody.autoMoving];
            returningBody.position[0] = this.originalTile * this.tileSize + this.tileSize / 2;
            returningBody.updateCurrentPoints();
            returningBody.autoMoving = [[this.originalTile, this.originalTile]];
            returningBody.speedToNext();
            let keptGroupBody = this.buildReturningBody(false, 0);
            keptGroupBody.moveToOriginalPoint();
            this.assert.deepStrictEqual(
                [returningGroup, returningPath.length, returningPath[0], returningPath.pop()],
                [0, 3, [this.originalTile + 2, this.originalTile], [this.originalTile, this.originalTile]]
            );
            this.assert.deepStrictEqual(
                [
                    returningBody.velocity,
                    returningBody.shapes[0].collisionGroup,
                    returningBody.autoMoving,
                    keptGroupBody.shapes[0].collisionGroup
                ],
                [[0, 0], this.objectGroup, false, this.objectGroup]
            );
        });
    }

    async testTheChaseDisablesTheObjectsCollisionsOnlyWhenConfigured()
    {
        await this.test('a chase crosses the objects only with the objects collisions off on chase', async () => {
            let chases = [];
            for(let disableObjectsCollisionsOnChase of [true, false]){
                let chasingBody = this.bodyBuilder.buildWithShape(this.objectGroup);
                chasingBody.disableObjectsCollisionsOnChase = disableObjectsCollisionsOnChase;
                let chasedBody = this.bodyBuilder.build();
                chasedBody.position[0] += 3 * this.tileSize;
                let chasePath = AnimationObject.prototype.chaseBody.call({objectBody: chasingBody}, chasedBody);
                chases.push([chasePath.length, chasePath.pop(), chasingBody.shapes[0].collisionGroup]);
            }
            let chasedTile = [this.originalTile + 3, this.originalTile];
            this.assert.deepStrictEqual(chases, [[4, chasedTile, 0], [4, chasedTile, this.objectGroup]]);
        });
    }

    async testTheReturnStartsAfterItsDelay()
    {
        await this.test('the return without delay starts at once and the default delay stops the body and starts after it', async () => {
            let immediateBody = this.buildReturningBody(false, 0);
            let scheduledTimeouts = new ScheduledTimeouts();
            let delayedBody = this.buildReturningBody(false, 100);
            await scheduledTimeouts.capture(() => {
                immediateBody.moveToOriginalPoint();
                delayedBody.moveToOriginalPoint();
            });
            let velocityBeforeDelay = [...delayedBody.velocity];
            let pathBeforeDelay = delayedBody.autoMoving;
            let delays = scheduledTimeouts.runAll();
            this.assert.deepStrictEqual(
                [immediateBody.autoMoving.length, velocityBeforeDelay, pathBeforeDelay, delays, delayedBody.autoMoving.length],
                [3, [0, 0], false, [100], 3]
            );
        });
    }

    async testTheMovementAreaCheck()
    {
        await this.test('a body without movement area is never inside it and one with area checks both axes', async () => {
            let body = this.bodyBuilder.build();
            body.updateCurrentPoints();
            let insideTile = [this.originalTile + 3, this.originalTile - 3];
            let outsideColumnTile = [this.originalTile + 4, this.originalTile];
            let outsideRowTile = [this.originalTile, this.originalTile + 4];
            let withoutArea = body.isInsideMovementArea(insideTile);
            body.movementAreaTiles = 3;
            this.assert.deepStrictEqual(
                [withoutArea, body.isInsideMovementArea(insideTile), body.isInsideMovementArea(outsideColumnTile), body.isInsideMovementArea(outsideRowTile)],
                [false, true, false, false]
            );
        });
    }

    async testAPathWithAMissingFirstPointRestoresTheGroup()
    {
        await this.test('a path with a missing first point restores the collision group', async () => {
            let body = this.buildMovingBody();
            body.autoMoving = [null, [this.originalTile + 1, this.originalTile]];
            body.speedToNext();
            this.assert.strictEqual(body.shapes[0].collisionGroup, this.objectGroup);
        });
    }

}

module.exports.TestPhysicalBodyPathMovement = TestPhysicalBodyPathMovement;
