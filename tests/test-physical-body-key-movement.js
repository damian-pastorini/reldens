/**
 *
 * Reldens - Test Physical Body Key Movement
 *
 */

const { BaseTest } = require('./base-test');
const { PhysicalBody } = require('../lib/world/server/physical-body');
const { GameConst } = require('../lib/game/constants');

class TestPhysicalBodyKeyMovement extends BaseTest
{

    createBody(worldOptions)
    {
        let body = new PhysicalBody({movementSpeed: 180, jumpSpeed: 540, jumpTimeMs: 0, animationBasedOnPress: true});
        body.playerId = 'session-a';
        body.position = [64, 100];
        body.bodyState = {dir: GameConst.DOWN, autoDirection: false};
        body.world = Object.assign({
            allowSimultaneous: false,
            applyGravity: false,
            narrowphase: {contactEquations: []}
        }, worldOptions);
        return body;
    }

    moveAndRead(body, directions)
    {
        for(let direction of directions){
            body.initMove(direction);
        }
        return [Math.round(body.velocity[0]), Math.round(body.velocity[1])];
    }

    async testTheSingleKeyMovementIgnoresTheOtherAxis()
    {
        await this.test('a single key body ignores a direction of the other axis while it moves', async () => {
            let body = this.createBody({});
            this.assert.deepStrictEqual(this.moveAndRead(body, [GameConst.RIGHT]), [180, 0]);
            this.assert.deepStrictEqual(this.moveAndRead(body, [GameConst.DOWN, GameConst.UP]), [180, 0]);
            this.assert.deepStrictEqual(this.moveAndRead(body, [GameConst.LEFT]), [-180, 0]);
            body.stopMove();
            this.assert.deepStrictEqual(this.moveAndRead(body, [GameConst.UP]), [0, -180]);
            this.assert.deepStrictEqual(this.moveAndRead(body, [GameConst.RIGHT, GameConst.LEFT]), [0, -180]);
            this.assert.deepStrictEqual(this.moveAndRead(body, [GameConst.DOWN]), [0, 180]);
        });
    }

    async testTheSingleKeyMovementChangesAxisAfterTheStop()
    {
        await this.test('a single key body changes the axis once the first key stop stands it still', async () => {
            let body = this.createBody({});
            this.moveAndRead(body, [GameConst.DOWN]);
            body.stopMove();
            this.assert.deepStrictEqual([body.velocity[0], body.velocity[1]], [0, 0]);
            this.assert.deepStrictEqual(this.moveAndRead(body, [GameConst.LEFT]), [-180, 0]);
        });
    }

    async testTheSimultaneousKeysNormalizeTheDiagonal()
    {
        await this.test('simultaneous keys move diagonally at the normalized speed and the last key of an axis wins', async () => {
            let diagonalSpeed = Math.round(180 * Math.SQRT1_2);
            let body = this.createBody({allowSimultaneous: true});
            this.assert.deepStrictEqual(this.moveAndRead(body, [GameConst.RIGHT]), [180, 0]);
            this.assert.deepStrictEqual(this.moveAndRead(body, [GameConst.DOWN]), [diagonalSpeed, diagonalSpeed]);
            this.assert.deepStrictEqual(
                this.moveAndRead(body, [GameConst.UP, GameConst.LEFT]),
                [-diagonalSpeed, -diagonalSpeed]
            );
            this.assert.deepStrictEqual(
                this.moveAndRead(body, [GameConst.RIGHT, GameConst.DOWN, GameConst.UP, GameConst.LEFT]),
                [-diagonalSpeed, -diagonalSpeed]
            );
            this.assert.strictEqual(body.bodyState.dir, GameConst.UP);
            let horizontalBody = this.createBody({allowSimultaneous: true});
            horizontalBody.diagonalHorizontal = true;
            this.moveAndRead(horizontalBody, [GameConst.RIGHT, GameConst.DOWN, GameConst.UP, GameConst.LEFT]);
            this.assert.strictEqual(horizontalBody.bodyState.dir, GameConst.LEFT);
        });
    }

    async testTheGravityBodyNeverMovesDown()
    {
        await this.test('a gravity body never moves down by key and its stop keeps the vertical speed', async () => {
            for(let allowSimultaneous of [false, true]){
                let body = this.createBody({allowSimultaneous, applyGravity: true});
                this.assert.deepStrictEqual(this.moveAndRead(body, [GameConst.DOWN]), [0, 0]);
                this.assert.deepStrictEqual(this.moveAndRead(body, [GameConst.RIGHT]), [180, 0]);
                body.velocity[1] = 90;
                body.stopMove();
                this.assert.deepStrictEqual([body.velocity[0], body.velocity[1]], [0, 90]);
            }
        });
    }

    async testTheGravityBodyJumpsOnlyStandingOnAWall()
    {
        await this.test('a gravity body jumps on the up key only while it stands on a wall', async () => {
            for(let allowSimultaneous of [false, true]){
                let body = this.createBody({allowSimultaneous, applyGravity: true});
                this.assert.deepStrictEqual(this.moveAndRead(body, [GameConst.UP]), [0, 0]);
                let floor = {isWall: true, isWorldWall: false, position: [64, 132], velocity: [0, 0]};
                body.world.narrowphase.contactEquations = [{bodyA: body, bodyB: floor}];
                this.assert.deepStrictEqual(this.moveAndRead(body, [GameConst.UP]), [0, -540]);
                let worldBorder = {isWall: true, isWorldWall: true, position: [64, 132], velocity: [0, 0]};
                body.velocity[1] = 0;
                body.world.narrowphase.contactEquations = [{bodyA: body, bodyB: worldBorder}];
                this.assert.deepStrictEqual(this.moveAndRead(body, [GameConst.UP]), [0, 0]);
            }
        });
    }

}

module.exports.TestPhysicalBodyKeyMovement = TestPhysicalBodyKeyMovement;
