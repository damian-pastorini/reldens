/**
 *
 * Reldens - PlayerBody
 *
 */

const { Body, vec2 } = require('p2');
const { GameConst } = require('../../game/constants');
const { Logger, sc } = require('@reldens/utils');

class PhysicalBody extends Body
{

    constructor(options)
    {
        super(options);
        /** @type ?BodyState **/
        this.bodyState = null;
        this.animationBasedOnPress = options.animationBasedOnPress;
        this.diagonalHorizontal = options.diagonalHorizontal;
        this.autoMoving = false;
        this.pathFinder = false;
        this.isChangingScene = false;
        this.currentCol = false;
        this.currentRow = false;
        this.originalCol = false;
        this.originalRow = false;
        this.jumpSpeed = sc.get(options, 'jumpSpeed', 540);
        this.jumpTimeMs = sc.get(options, 'jumpTimeMs', 180);
        this.movementSpeed = sc.get(options, 'movementSpeed', 180);
        this.autoMovingResetMaxRetries = sc.get(options, 'autoMovingResetMaxRetries', 5);
        this.autoMovingResetRetries = 0;
    }

    integrate(dt)
    {
        if(GameConst.STATUS.DISABLED === this.bodyState?.inState){
            Logger.debug('Body state disabled.', {key: this.bodyState?.key, state: this.bodyState?.inState});
            return;
        }
        let minv = this.invMass,
            f = this.force,
            pos = this.position,
            velocity = this.velocity;
        // save old position
        vec2.copy(this.previousPosition, this.position);
        this.previousAngle = this.angle;
        // velocity update
        if(!this.fixedRotation){
            this.angularVelocity += this.angularForce * this.invInertia * dt;
        }
        let integrateFhMinv = vec2.create();
        vec2.scale(integrateFhMinv, f, dt * minv);
        vec2.multiply(integrateFhMinv, this.massMultiplier, integrateFhMinv);
        vec2.add(velocity, integrateFhMinv, velocity);
        // CCD
        if(!this.integrateToTimeOfImpact(dt)){
            let integrateVelodt = vec2.create();
            // regular position update
            vec2.scale(integrateVelodt, velocity, dt);
            vec2.add(pos, pos, integrateVelodt);
            if(!this.fixedRotation){
                this.angle += this.angularVelocity * dt;
            }
        }
        if(this.autoMoving && this.autoMoving.length){
            this.speedToNext(pos);
        }
        this.updateBodyState();
        this.aabbNeedsUpdate = true;
    }

    speedToNext()
    {
        if(this.currentCol === this.autoMoving[0][0] && this.currentRow === this.autoMoving[0][1]){
            // if the point was reach then remove it to process the next one:
            this.autoMoving.shift();
            if(0 === this.autoMoving.length){
                // if there are no more points to process then stop the body and reset the path:
                this.stopFull();
                this.resetAuto();
                this.alignToTile();
            }
            return;
        }
        if(this.currentCol === this.autoMoving[0][0] && this.velocity[0] !== 0){
            this.velocity[0] = 0;
            this.alignToTile();
        }
        if(this.currentCol > this.autoMoving[0][0]){
            this.initMove(GameConst.LEFT, true);
        }
        if(this.currentCol < this.autoMoving[0][0]){
            this.initMove(GameConst.RIGHT, true);
        }
        if(this.currentRow === this.autoMoving[0][1] && this.velocity[1] !== 0){
            this.stopY();
            this.alignToTile();
        }
        if(this.currentRow > this.autoMoving[0][1]){
            this.initMove(GameConst.UP, true);
        }
        if(this.currentRow < this.autoMoving[0][1]){
            this.initMove(GameConst.DOWN, true);
        }
        this.updateCurrentPoints();
    }

    alignToTile()
    {
        let targetX = this.currentCol * this.worldTileWidth;
        let targetY = this.currentRow * this.worldTileHeight;
        let tolerance = 0.1
        let distX = targetX - this.position[0];
        let distY = targetY - this.position[1];
        if (Math.abs(distX) <= tolerance && Math.abs(distY) <= tolerance) {
            this.position[0] = targetX;
            this.position[1] = targetY;
        }
    }

    updateBodyState()
    {
        if(!sc.hasOwn(this.bodyState, 'x') || !sc.hasOwn(this.bodyState, 'y')){
            return;
        }
        if(!this.position[0] || !this.position[1]){
            return;
        }
        // only update the body if it moves:
        if(this.isNotMoving()){
            this.bodyState.mov = false;
            return;
        }
        // @NOTE: with the key word "bullet" we will refer to bodies that will be created, moved, and  destroyed on
        // hit or that reach the world boundaries.
        this.removeBullet();
        // update position:
        if(this.bodyState.x !== this.position[0]){
            this.bodyState.x = this.position[0];
        }
        if(this.bodyState.y !== this.position[1]){
            this.bodyState.y = this.position[1];
        }
        // start or stop animation:
        let speedX = sc.numberWithDecimals(this.velocity[0], 2);
        let speedY = sc.numberWithDecimals(this.velocity[1], 2);
        this.bodyState.mov = 0 !== speedX || 0 !== speedY;
    }

    removeBullet()
    {
        if(!this.isBullet){
            return;
        }
        if(
            0 > this.position[0]
            || this.position[0] > (this.worldWidth * this.worldTileWidth)
            || 0 > this.position[1]
            || this.position[1] > (this.worldHeight * this.worldTileHeight)
            || (0 === this.velocity[0] && 0 === this.velocity[1])
        ){
            this.world.removeBodies.push(this);
            if(this.bodyStateId){
                this.world.removeBulletsStateIds.push(this.bodyStateId);
            }
        }
    }

    isNotMoving()
    {
        return this.bodyState.x === this.position[0]
            && this.bodyState.y === this.position[1]
            && this.velocity[0] === 0
            && this.velocity[1] === 0;
    }

    resetAuto()
    {
        this.autoMoving = false;
    }

    initMove(direction, isAuto = false)
    {
        if(!isAuto){
            // if user moves the player then reset the auto move.
            this.resetAuto();
        }
        if(!this.world){
            return;
        }
        if(this.world.allowSimultaneous){
            this.simultaneousKeyPressMovement(direction, this.movementSpeed);
            return;
        }
        return this.singleKeyPressMovement(direction, this.movementSpeed);
    }

    singleKeyPressMovement(direction, speed)
    {
        // if body is moving then avoid multiple key press at the same time:
        if(direction === GameConst.RIGHT && 0 === this.velocity[1]){
            this.velocity[0] = speed;
        }
        if(direction === GameConst.LEFT && 0 === this.velocity[1]){
            this.velocity[0] = -speed;
        }
        if(direction === GameConst.UP && 0 === this.velocity[0]){
            this.moveUp(speed);
        }
        if(direction === GameConst.DOWN && 0 === this.velocity[0] && !this.world.applyGravity){
            this.velocity[1] = speed;
        }
    }

    simultaneousKeyPressMovement(direction, speed)
    {
        if(!this.world.applyGravity){
            this.simultaneousMovementDiagonalSpeedFix(direction, speed);
            return;
        }
        if(direction === GameConst.RIGHT){
            this.validateAndSetDirection(direction, this.diagonalHorizontal, this.velocity[1]);
            this.velocity[0] = speed;
        }
        if(direction === GameConst.LEFT){
            this.validateAndSetDirection(direction, this.diagonalHorizontal, this.velocity[1]);
            this.velocity[0] = -speed;
        }
        if(direction === GameConst.UP){
            this.validateAndSetDirection(direction, !this.diagonalHorizontal, this.velocity[0]);
            this.moveUp(speed);
        }
    }

    simultaneousMovementDiagonalSpeedFix(direction, speed)
    {
        let dx = 0 === this.velocity[0] ? 0 : 0 > this.velocity[0] ? -1 : 1;
        let dy = 0 === this.velocity[1] ? 0 : 0 > this.velocity[1] ? -1 : 1;
        if(direction === GameConst.RIGHT){
            dx = 1;
        }
        if(direction === GameConst.LEFT){
            dx = -1;
        }
        if(direction === GameConst.UP){
            dy = -1;
        }
        if(direction === GameConst.DOWN){
            dy = 1;
        }
        let normalization = this.normalizeSpeed(dx, dy);
        this.velocity[0] = speed * dx * normalization;
        this.velocity[1] = speed * dy * normalization;
        if(direction === GameConst.RIGHT || direction === GameConst.LEFT){
            this.validateAndSetDirection(direction, this.diagonalHorizontal, this.velocity[1]);
        }
        if(direction === GameConst.UP || direction === GameConst.DOWN){
            this.validateAndSetDirection(direction, !this.diagonalHorizontal, this.velocity[0]);
        }
    }

    moveUp(speed)
    {
        if(!this.world.applyGravity){
            this.velocity[1] = -speed;
            return;
        }
        if(!this.canJump()){
            return;
        }
        this.velocity[1] = -this.jumpSpeed;
        setTimeout(() => {
            this.stopY();
        }, this.jumpTimeMs);
    }

    calculateMagnitude(x, y)
    {
        return Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
    }

    checkNonZeroComponents(x, y)
    {
        return Math.abs(x) > 0 || Math.abs(y) > 0;
    }

    normalizeSpeed(x, y)
    {
        return this.checkNonZeroComponents(x, y) ? 1 / this.calculateMagnitude(x, y) : 0;
    }

    validateAndSetDirection(direction, diagonal, velocity)
    {
        if((this.animationBasedOnPress || this.bodyState.autoDirection) && (diagonal || 0 === velocity)){
            this.bodyState.dir = direction;
        }
    }

    stopMove()
    {
        this.world && this.world.applyGravity ? this.stopX() : this.stopFull();
    }

    stopFull(pStop = false)
    {
        this.velocity = [0, 0];
        this.pStop = pStop;
    }

    stopX(pStop = false)
    {
        this.velocity[0] = 0;
        this.pStop = pStop;
    }

    stopY(pStop = false)
    {
        this.velocity[1] = 0;
        this.pStop = pStop;
    }

    moveToPoint(toPoint)
    {
        this.resetAuto();
        this.updateCurrentPoints();
        let fromPoints = [this.currentCol, this.currentRow];
        let toPoints = [toPoint.column, toPoint.row];
        let pathFinder = this.getPathFinder();
        if(!pathFinder){
            Logger.debug('Pathfinder not set in body.', {id: this.id, key: this.bodyState?.key});
            return false;
        }
        this.autoMoving = pathFinder.findPath(fromPoints, toPoints);
        if(!this.autoMoving){
             this.stopMove();
        }
        return this.autoMoving;
    }

    updateCurrentPoints()
    {
        // if the player disconnects, and it's the only one on the room the world would be destroyed at this point:
        if(!this.world){
            Logger.debug('Missing world on physical body.', {id: this.id, key: this.bodyState?.key});
            return;
        }
        let {currentCol, currentRow} = this.positionToTiles(this.position[0], this.position[1]);
        if(!this.originalCol){
            this.originalCol = currentCol;
        }
        if(!this.originalRow){
            this.originalRow = currentRow;
        }
        this.currentCol = currentCol;
        this.currentRow = currentRow;
        return this;
    }

    moveToOriginalPoint()
    {
        if(!this.originalCol || this.originalRow){
            this.updateCurrentPoints();
        }
        this.moveToPoint({column: this.originalCol, row: this.originalRow});
    }

    canJump()
    {
        for(let c of this.world.narrowphase.contactEquations){
            let player = c.bodyA === this ? c.bodyA : c.bodyB;
            let wall = c.bodyA.isWall ? c.bodyA : c.bodyB;
            if(
                player.playerId && 0 <= Number(Number(player.velocity[1]).toFixed(2))
                && wall.isWall && !wall.isWorldWall
                && player.position[1] < wall.position[1]
            ){
                return true;
            }
        }
        return false;
    }

    positionToTiles(x, y)
    {
        let currentCol = Math.round((x - (this.worldTileWidth/2)) / this.worldTileWidth);
        currentCol = (currentCol >= 0) ? ((currentCol > this.worldWidth) ? (this.worldWidth) : currentCol) : 0;
        let currentRow = Math.round((y - (this.worldTileHeight/2)) / this.worldTileHeight);
        currentRow = (currentRow >= 0) ? ((currentRow > this.worldHeight) ? (this.worldHeight) : currentRow) : 0;
        return {currentCol, currentRow};
    }

    getPathFinder()
    {
        // @NOTE: body pathfinder is for when the body has its own respawn area and grid, the world pathfinder is for
        // any object in the room that could be anywhere in the room.
        return (this.pathFinder ? this.pathFinder : this.world?.pathFinder);
    }

    get worldTileWidth()
    {
        return this.world?.mapJson?.tilewidth;
    }

    get worldTileHeight()
    {
        return this.world?.mapJson?.tileheight;
    }

    get worldWidth()
    {
        return this.world?.mapJson?.width;
    }

    get worldHeight()
    {
        return this.world?.mapJson?.height;
    }

}

module.exports.PhysicalBody = PhysicalBody;
