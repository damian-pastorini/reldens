/**
 *
 * Reldens - Test Object Random Movement
 *
 */

const { BaseTest } = require('./base-test');
const { ObjectRandomMovement } = require('../lib/objects/server/object/object-random-movement');
const { RandomMovementBodyBuilder } = require('./fixtures/random-movement-body-builder');
const { GameConst } = require('../lib/game/constants');

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
        this.bodyBuilder = new RandomMovementBodyBuilder(this.tileSize, this.mapSize, this.originalTile);
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

    buildBodyWithAShorterRouteOutsideTheArea()
    {
        let body = this.bodyBuilder.build();
        body.updateCurrentPoints();
        body.position[1] += 2 * this.tileSize;
        let wallColumn = this.originalTile + 1;
        let wallFirstRow = this.originalTile - this.maxTiles + 1;
        let wallLastRow = this.originalTile + this.maxTiles;
        this.bodyBuilder.blockColumnTiles(body.world.pathFinder.grid, wallColumn, wallFirstRow, wallLastRow);
        return {body, wallColumn};
    }

    collectInvalidTargets(randomMovement, isInvalidTarget)
    {
        let invalidTargets = [];
        for(let sample = 0; sample < this.targetSamples; sample++){
            let target = randomMovement.findTargetTile();
            if(!target || isInvalidTarget(target)){
                invalidTargets.push(target);
            }
        }
        return invalidTargets;
    }

    async testRandomTargetsStayAroundTheOriginalTile()
    {
        await this.test('the random targets are walkable tiles around the original tile and never the current tile', async () => {
            let invalidTargets = this.collectInvalidTargets(
                this.createRandomMovement(this.bodyBuilder.build()),
                (target) => this.isOutsideTheMovementArea(target)
                    || (this.originalTile === target.column && this.originalTile === target.row)
            );
            this.assert.deepStrictEqual(invalidTargets, []);
        });
    }

    async testNoTargetWhenTheSurroundingTilesAreNotWalkable()
    {
        await this.test('there is no random target when every tile around the original tile is not walkable', async () => {
            let body = this.bodyBuilder.build();
            let firstTile = this.originalTile - this.maxTiles;
            let lastTile = this.originalTile + this.maxTiles;
            for(let column = firstTile; column <= lastTile; column++){
                this.bodyBuilder.blockColumnTiles(body.world.pathFinder.grid, column, firstTile, lastTile);
            }
            this.assert.strictEqual(this.createRandomMovement(body).findTargetTile(), false);
        });
    }

    async testMoveToRandomTileStartsAPathInsideTheArea()
    {
        await this.test('moving to a random tile starts a path that ends inside the movement area', async () => {
            let body = this.bodyBuilder.build();
            let path = this.createRandomMovement(body).moveToRandomTile();
            this.assert.notStrictEqual(0, body.autoMoving.length);
            let lastNode = [...path].pop();
            this.assert.strictEqual(this.isOutsideTheMovementArea({column: lastNode[0], row: lastNode[1]}), false);
        });
    }

    async testTargetsBehindAWallAreNotReachedFromOutsideTheArea()
    {
        await this.test('the random targets are only the tiles reached with a path inside the movement area', async () => {
            let body = this.bodyBuilder.build();
            let wallColumn = this.originalTile + 1;
            this.bodyBuilder.blockColumnTiles(body.world.pathFinder.grid, wallColumn, 0, this.originalTile + this.maxTiles);
            let invalidTargets = this.collectInvalidTargets(
                this.createRandomMovement(body),
                (target) => wallColumn < target.column || target.path.some(
                    pathTile => this.isOutsideTheMovementArea({column: pathTile[0], row: pathTile[1]})
                )
            );
            this.assert.deepStrictEqual(invalidTargets, []);
        });
    }

    async testTargetsWithAShorterRouteOutsideTheAreaAreReachedInsideIt()
    {
        await this.test('a target reached faster from outside the area is reached with the longer path inside it', async () => {
            let {body, wallColumn} = this.buildBodyWithAShorterRouteOutsideTheArea();
            let reachedBehindTheWall = false;
            let invalidTargets = this.collectInvalidTargets(this.createRandomMovement(body), (target) => {
                if(wallColumn < target.column && this.originalTile < target.row){
                    reachedBehindTheWall = true;
                }
                return target.path.some(pathTile => this.isOutsideTheMovementArea({column: pathTile[0], row: pathTile[1]}));
            });
            this.assert.deepStrictEqual(invalidTargets, []);
            this.assert.strictEqual(reachedBehindTheWall, true);
        });
    }

    async testRecalculatedPathsStayInsideTheArea()
    {
        await this.test('a path recalculated while following a random path never leaves the movement area', async () => {
            let {body} = this.buildBodyWithAShorterRouteOutsideTheArea();
            this.createRandomMovement(body).moveToRandomTile();
            body.updateCurrentPoints();
            let currentTile = [body.currentCol, body.currentRow];
            let targetTile = [this.originalTile + this.maxTiles, this.originalTile + this.maxTiles];
            let path = body.findAutoMovingPath(currentTile, targetTile);
            this.assert.notStrictEqual(0, path.length);
            this.assert.deepStrictEqual(
                path.filter(pathTile => this.isOutsideTheMovementArea({column: pathTile[0], row: pathTile[1]})),
                []
            );
            body.resetAuto();
            this.assert.strictEqual(body.autoMovingGrid, false);
        });
    }

    async testBodyOutsideTheAreaWalksBackToTheOriginalTile()
    {
        await this.test('a body pushed outside the movement area walks back to its original tile', async () => {
            let body = this.bodyBuilder.build();
            body.updateCurrentPoints();
            body.position[0] += (this.maxTiles + 2) * this.tileSize;
            let path = this.createRandomMovement(body).moveToRandomTile();
            this.assert.deepStrictEqual([...path].pop(), [this.originalTile, this.originalTile]);
            this.assert.strictEqual(body.autoMovingGrid, false);
        });
    }

    async testBodyPushedOutsideTheAreaReturnsWithTheAreaGrid()
    {
        await this.test('a body pushed outside the area while following an area path returns to its original tile', async () => {
            let body = this.bodyBuilder.build();
            body.updateCurrentPoints();
            body.autoMovingGrid = this.createRandomMovement(body).createMovementAreaGrid(body.world.pathFinder.grid);
            body.position[0] += (this.maxTiles + 2) * this.tileSize;
            body.updateCurrentPoints();
            let currentTile = [body.currentCol, body.currentRow];
            let returnPath = body.findAutoMovingPath(currentTile, [this.originalTile, this.originalTile]);
            this.assert.deepStrictEqual([...returnPath].pop(), [this.originalTile, this.originalTile]);
            let outsidePath = body.findAutoMovingPath(currentTile, [this.originalTile + 1, this.originalTile]);
            this.assert.deepStrictEqual(outsidePath, []);
        });
    }

    async testBodyInsideTheAreaNeverReturnsWithAPathOutsideIt()
    {
        await this.test('a body inside the area never gets a path to its original tile that leaves the area', async () => {
            let body = this.bodyBuilder.build();
            body.updateCurrentPoints();
            let randomMovement = this.createRandomMovement(body);
            this.bodyBuilder.blockColumnTiles(
                body.world.pathFinder.grid,
                this.originalTile + 1,
                this.originalTile - this.maxTiles,
                this.originalTile + this.maxTiles
            );
            body.autoMovingGrid = randomMovement.createMovementAreaGrid(body.world.pathFinder.grid);
            body.position[0] += 2 * this.tileSize;
            body.updateCurrentPoints();
            let currentTile = [body.currentCol, body.currentRow];
            let originalTile = [this.originalTile, this.originalTile];
            this.assert.notStrictEqual(body.world.pathFinder.findPath(currentTile, originalTile).length, 0);
            this.assert.deepStrictEqual(body.findAutoMovingPath(currentTile, originalTile), []);
        });
    }

    async testBodyDoesNotMoveWhileItIsAlreadyMoving()
    {
        await this.test('the body does not get a new random target while it is following a path', async () => {
            let body = this.bodyBuilder.build();
            body.autoMoving = [[this.originalTile, this.originalTile + 1]];
            this.assert.strictEqual(this.createRandomMovement(body).moveToRandomTile(), false);
        });
    }

    async testBlockedPathIsDroppedForANewTarget()
    {
        await this.test('a path that kept the body on the same tile between two moves is dropped for a new target', async () => {
            let body = this.bodyBuilder.build();
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
            let body = this.bodyBuilder.build();
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
            let body = this.bodyBuilder.build();
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
            let body = this.bodyBuilder.build();
            body.bodyState.inState = GameConst.STATUS.DEATH;
            this.assert.strictEqual(this.createRandomMovement(body).moveToRandomTile(), false);
        });
    }

    async testBodyInBattleDoesNotMove()
    {
        await this.test('an object in battle with players does not move randomly', async () => {
            let randomMovement = this.createRandomMovement(this.bodyBuilder.build(), {1: true});
            this.assert.strictEqual(randomMovement.moveToRandomTile(), false);
        });
    }

    async testOpenDialogsPauseTheMovementUntilEveryDialogIsClosed()
    {
        await this.test('an object does not move randomly until every player closed its dialog', async () => {
            let randomMovement = this.createRandomMovement(this.bodyBuilder.build());
            randomMovement.pauseForInteraction('session-a');
            randomMovement.pauseForInteraction('session-b');
            randomMovement.resumeAfterInteraction('session-a');
            this.assert.strictEqual(randomMovement.moveToRandomTile(), false);
            randomMovement.resumeAfterInteraction('session-b');
            this.assert.notStrictEqual(randomMovement.moveToRandomTile(), false);
        });
    }

    async testInteractionStopsThePathTheBodyIsFollowing()
    {
        await this.test('a player interaction stops the path the object body is following', async () => {
            let body = this.bodyBuilder.build();
            body.autoMoving = [[this.originalTile, this.originalTile + 1]];
            this.createRandomMovement(body).pauseForInteraction('session-a');
            this.assert.strictEqual(body.autoMoving, false);
        });
    }

    async testMovementStopsWhenTheBodyLeftTheWorld()
    {
        await this.test('the movement loop stops when the body is no longer in the world', async () => {
            let body = this.bodyBuilder.build();
            let randomMovement = this.createRandomMovement(body);
            body.world = null;
            randomMovement.moveAndScheduleNext();
            this.assert.strictEqual(randomMovement.movementTimer, false);
        });
    }

}

module.exports.TestObjectRandomMovement = TestObjectRandomMovement;
