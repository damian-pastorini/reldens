/**
 *
 * Reldens - Test Object Random Movement Limits
 *
 */

const timersPromises = require('timers/promises');
const { RandomMovementBaseTest } = require('./fixtures/random-movement-base-test');
const { ObjectRandomMovement } = require('../lib/objects/server/object/object-random-movement');

class TestObjectRandomMovementLimits extends RandomMovementBaseTest
{

    async waitAndCountMoves(randomMovement, waitMs)
    {
        await timersPromises.setTimeout(waitMs);
        return randomMovement.movesCount;
    }

    async testNextMoveWaitsTheConfiguredDelay()
    {
        await this.test('the next move waits a random delay between the configured minimum and maximum', async () => {
            let delay = {minDelay: 200, maxDelay: 300};
            let randomMovement = new ObjectRandomMovement(
                Object.assign({objectBody: this.bodyBuilder.build(), getInBattlePlayers: () => ({})}, delay)
            );
            randomMovement.scheduleNextMove();
            let movesBeforeTheMinimum = await this.waitAndCountMoves(randomMovement, delay.minDelay - 50);
            let movesAfterTheMaximum = await this.waitAndCountMoves(randomMovement, delay.maxDelay - delay.minDelay + 100);
            randomMovement.stop();
            this.assert.deepStrictEqual([movesBeforeTheMinimum, movesAfterTheMaximum], [0, 1]);
        });
    }

    async testEveryTargetAttemptFailingGivesNoTarget()
    {
        await this.test('every one of the configured target attempts failing gives no random target', async () => {
            let movementProps = {maxTiles: 2, targetAttempts: 7};
            let body = this.bodyBuilder.build();
            let initialAutoMoving = body.autoMoving;
            this.bodyBuilder.blockArea(
                body.world.pathFinder.grid,
                this.originalTile - movementProps.maxTiles,
                this.originalTile + movementProps.maxTiles
            );
            let randomMovement = new ObjectRandomMovement(
                Object.assign({objectBody: body, getInBattlePlayers: () => ({})}, movementProps)
            );
            let checkedTargets = [];
            let isValidTarget = randomMovement.isValidTarget.bind(randomMovement);
            randomMovement.isValidTarget = (grid, column, row) => checkedTargets.push([column, row]) && isValidTarget(grid, column, row);
            this.assert.strictEqual(randomMovement.moveToRandomTile(), false);
            this.assert.strictEqual(checkedTargets.length, movementProps.targetAttempts);
            this.assert.strictEqual(body.autoMoving, initialAutoMoving);
        });
    }

    async testBodyWithoutPathFinderDoesNotMove()
    {
        await this.test('a body in a room without the path finder gets no random move', async () => {
            let body = this.bodyBuilder.build();
            let initialAutoMoving = body.autoMoving;
            body.world.pathFinder = false;
            let randomMovement = new ObjectRandomMovement({objectBody: body, getInBattlePlayers: () => ({})});
            this.assert.deepStrictEqual([randomMovement.moveToRandomTile(), body.autoMoving], [false, initialAutoMoving]);
        });
    }

    async testBodyOutsideTheAreaWithAnUnreachableOriginGetsNoTarget()
    {
        await this.test('a body pushed outside its area with its original tile walled in gets no target', async () => {
            let maxTiles = 3;
            let body = this.bodyBuilder.build();
            body.updateCurrentPoints();
            let grid = body.world.pathFinder.grid;
            this.bodyBuilder.blockArea(grid, this.originalTile - 1, this.originalTile + 1);
            grid.setWalkableAt(this.originalTile, this.originalTile, true);
            body.position[0] += (maxTiles + 2) * this.tileSize;
            let initialAutoMoving = body.autoMoving;
            let randomMovement = new ObjectRandomMovement({objectBody: body, getInBattlePlayers: () => ({}), maxTiles});
            this.assert.deepStrictEqual([randomMovement.moveToRandomTile(), body.autoMoving], [false, initialAutoMoving]);
        });
    }

    async testOneTileAreaKeepsEveryTargetNextToTheOriginalTile()
    {
        await this.test('with a one tile area every random target is next to the original tile', async () => {
            let body = this.bodyBuilder.build();
            let randomMovement = new ObjectRandomMovement({objectBody: body, getInBattlePlayers: () => ({}), maxTiles: 1});
            let farTargets = [];
            for(let sample = 0; sample < 200; sample++){
                let target = randomMovement.findTargetTile();
                if(!target || 1 < Math.abs(target.column - this.originalTile) || 1 < Math.abs(target.row - this.originalTile)){
                    farTargets.push(target);
                }
            }
            this.assert.deepStrictEqual(farTargets, []);
        });
    }

    async testBodyMovesAgainOnceTheBattleEnded()
    {
        await this.test('a body in battle gets no random move and moves again once the battle ended', async () => {
            let inBattlePlayers = {1: true};
            let randomMovement = new ObjectRandomMovement({
                objectBody: this.bodyBuilder.build(),
                getInBattlePlayers: () => inBattlePlayers
            });
            let inBattleMove = randomMovement.moveToRandomTile();
            delete inBattlePlayers[1];
            let afterBattleMove = randomMovement.moveToRandomTile();
            this.assert.deepStrictEqual([inBattleMove, Array.isArray(afterBattleMove) && 0 < afterBattleMove.length], [false, true]);
        });
    }

}

module.exports.TestObjectRandomMovementLimits = TestObjectRandomMovementLimits;
