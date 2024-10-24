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
        this.speedThreshold = sc.get(options, 'speedThreshold', 0.5);
        this.worldPositionPrecision = sc.get(options, 'worldPositionPrecision', 0);
        this.worldSpeedPrecision = sc.get(options, 'worldSpeedPrecision', 0);
        this.autoMovingResetMaxRetries = sc.get(options, 'autoMovingResetMaxRetries', 5);
        this.autoMovingResetRetries = 0;
        this.moveToOriginalPointWithDelay = sc.get(options, 'moveToOriginalPointWithDelay', 100);
        this.moveToOriginalPointTimer = false;
        this.originalSpeed = {x: 0, y: 0};
        this.speedToNextMaxRetries = sc.get(options, 'speedToNextMaxRetries', 3);
        this.speedToNextRetryCounter = {col: 0, row: 0, retries: 0};
        this.lastSetCollisionGroup = false;
    }

    integrate(dt)
    {
        if(GameConst.STATUS.DISABLED === this.bodyState?.inState){
            // Logger.debug('Body state disabled.', {key: this.bodyState?.key, state: this.bodyState?.inState});
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
        this.speedToNext();
        this.aabbNeedsUpdate = true;
        this.velocity[0] = Math.abs(this.velocity[0]) < 0.0001 ? 0 : sc.roundToPrecision(this.velocity[0], 4);
        this.velocity[1] = Math.abs(this.velocity[1]) < 0.0001 ? 0 : sc.roundToPrecision(this.velocity[1], 4);
        if(Math.abs(this.velocity[0]) < 1e-3){
            this.stopX();
        }
        if(Math.abs(this.velocity[1]) < 1e-3){
            this.stopY();
        }
        this.updateBodyState();
    }

    speedToNext()
    {
        if(!this.autoMoving || 0 === this.autoMoving.length){
            // Logger.debug('Body "'+this.bodyLogKey()+'" is not autoMoving.');
            this.setShapesCollisionGroup(this.originalCollisionGroup);
            return;
        }
        if(!this.autoMoving[0]){
            Logger.error('Missing autoMoving first index.');
            this.setShapesCollisionGroup(this.originalCollisionGroup);
            return;
        }
        let autoMovingCurrentCol = this.autoMoving[0][0];
        let autoMovingCurrentRow = this.autoMoving[0][1];
        if(
            0 !== this.speedToNextRetryCounter.col && this.speedToNextRetryCounter.col === autoMovingCurrentCol
            && 0!== this.speedToNextRetryCounter.row && this.speedToNextRetryCounter.row === autoMovingCurrentRow
            && 0 !== this.velocity[0]
            && 0 !== this.velocity[1]
        ){
            this.speedToNextRetryCounter.retries++;
        }
        if(this.speedToNextMaxRetries === this.speedToNextRetryCounter.retries){
            /*
            Logger.debug(
                'Body "'+this.bodyLogKey()+'" speed to next max retries reached: '
                +this.speedToNextRetryCounter.retries+' / '+this.speedToNextMaxRetries
            );
            */
            this.speedToNextRetryCounter.col = 0;
            this.speedToNextRetryCounter.row = 0;
            let fromPoint = this.autoMoving.shift();
            let toPoint = this.autoMoving.pop();
            this.stopFull(true);
            this.alignToTile();
            this.autoMoving = this.getPathFinder().findPath(fromPoint, toPoint);
            this.speedToNextRetryCounter.retries = 0;
            return;
        }
        this.speedToNextRetryCounter.col = autoMovingCurrentCol;
        this.speedToNextRetryCounter.row = autoMovingCurrentRow;
        /*
        Logger.debug(
            'Body "'+this.bodyLogKey()+'" speed to next point from > to: '
            +this.currentCol+' / '+this.currentRow+' > '+autoMovingCurrentCol+' / '+ autoMovingCurrentRow
            +' - Counters col / row: '+this.speedToNextRetryCounter.col+' / '+this.speedToNextRetryCounter.row
            +' - Retry: '+this.speedToNextRetryCounter.retries+' / '+this.speedToNextMaxRetries
        );
        */
        if(this.currentCol === autoMovingCurrentCol && this.currentRow === autoMovingCurrentRow){
            // if the point was reach then remove it to process the next one:
            this.autoMoving.shift();
            if(0 === this.autoMoving.length){
                // if there are no more points to process then stop the body and reset the path:
                this.stopAutoMoving();
            }
            return;
        }
        if(this.currentCol === autoMovingCurrentCol && 0 !== this.velocity[0]){
            this.stopX();
            // Logger.debug('Body "'+this.bodyLogKey()+'" speed to next stop X.');
            this.alignToTile();
        }
        if(this.currentCol > autoMovingCurrentCol){
            this.initMove(GameConst.LEFT, true);
        }
        if(this.currentCol < autoMovingCurrentCol){
            this.initMove(GameConst.RIGHT, true);
        }
        if(this.currentRow === autoMovingCurrentRow && 0 !== this.velocity[1]){
            this.stopY();
            // Logger.debug('Body "'+this.bodyLogKey()+'" speed to next stop Y.');
            this.alignToTile();
        }
        if(this.currentRow > autoMovingCurrentRow){
            this.initMove(GameConst.UP, true);
        }
        if(this.currentRow < autoMovingCurrentRow){
            this.initMove(GameConst.DOWN, true);
        }
        this.updateCurrentPoints();
    }

    stopAutoMoving()
    {
        this.stopFull();
        this.resetAuto();
        this.alignToTile();
        this.setShapesCollisionGroup(this.originalCollisionGroup);
        // Logger.debug('Body "' + this.bodyLogKey() + '" speed to next ended.');
    }

    alignToTile()
    {
        if(!this.currentCol || !this.currentRow){
            this.updateCurrentPoints();
        }
        let targetX = this.currentCol * this.worldTileWidth;
        let targetY = this.currentRow * this.worldTileHeight;
        let tolerance = 0.01;
        let distX = targetX - this.position[0];
        let distY = targetY - this.position[1];
        if(Math.abs(distX) <= tolerance && Math.abs(distY) <= tolerance){
            // Logger.debug('Aligning to tile col / row: '+this.currentCol+' / '+this.currentRow, {targetX, targetY});
            this.position[0] = targetX;
            this.position[1] = targetY;
        }
    }

    updateBodyState()
    {
        if(!sc.hasOwn(this.bodyState, 'x') || !sc.hasOwn(this.bodyState, 'y')){
            return;
        }
        // only update the body if it moves:
        if(this.isNotMoving()){
            // @NOTE: careful this will overload the logs.
            // Logger.debug('Body "'+this.bodyLogKey()+'" is not moving.');
            this.bodyState.mov = false;
            return;
        }
        let positionX = sc.roundToPrecision(this.position[0], 0);
        let positionY = sc.roundToPrecision(this.position[1], 0);
        if(!positionX || !positionY){
            return;
        }
        // update position:
        if(this.bodyState.x !== positionX){
            // Logger.debug('Update body "'+this.bodyLogKey()+'" state X: '+this.bodyState.x +' / '+ positionX);
            this.bodyState.x = sc.roundToPrecision(positionX, this.worldPositionPrecision);
        }
        if(this.bodyState.y !== positionY){
            // Logger.debug('Update body "'+this.bodyLogKey()+'" state Y: '+this.bodyState.y +' / '+ positionY);
            this.bodyState.y = sc.roundToPrecision(positionY, this.worldPositionPrecision);
        }
        // start or stop animation:
        let speedX = sc.roundToPrecision(this.velocity[0], this.worldSpeedPrecision);
        let speedY = sc.roundToPrecision(this.velocity[1], this.worldSpeedPrecision);
        // Logger.debug('Body "'+this.bodyLogKey()+'" speed X / Y: '+speedX+' / '+speedY);
        this.bodyState.mov = 0 !== speedX || 0 !== speedY;
        // @NOTE: with the key word "bullet" we will refer to bodies that will be created, moved, and  destroyed on
        // hit or that reach the world boundaries.
        this.removeInvalidStateBulletBody();
    }

    bodyLogKey()
    {
        if(this.playerId){
            return 'PJ-'+this.playerId;
        }
        return this.bodyState?.key;
    }

    removeInvalidStateBulletBody()
    {
        if(!this.isBullet){
            return;
        }
        if(this.isOutOfWorldBounds() || this.hasInvalidSpeed()){
            this.world.removeBodies.push(this);
            if(this.bodyStateId){
                this.world.removeBulletsStateIds.push(this.bodyStateId);
            }
        }
    }

    hasInvalidSpeed()
    {
        let bodySpeedX = this.isBullet ? this.originalSpeed.x : this.movementSpeed;
        let bodySpeedY = this.isBullet ? this.originalSpeed.x : this.movementSpeed;
        let minimumSpeedX = bodySpeedX * this.speedThreshold;
        let minimumSpeedY = bodySpeedY * this.speedThreshold;
        if(Math.abs(this.velocity[0]) < minimumSpeedX){
            this.stopX(true);
        }
        if(Math.abs(this.velocity[1]) < minimumSpeedY){
            this.stopY(true);
            this.stopY(true);
        }
        return 0 === this.velocity[0] && 0 === this.velocity[1];
    }

    isOutOfWorldBounds()
    {
        return 0 > this.position[0]
            || this.position[0] > (this.worldWidth * this.worldTileWidth)
            || 0 > this.position[1]
            || this.position[1] > (this.worldHeight * this.worldTileHeight);
    }

    isNotMoving()
    {
        // @TODO - BETA - Refactor to replace the threshold and accurately consider the normalized speed.
        let minimumSpeed = this.movementSpeed * this.speedThreshold;
        let velocityX = sc.roundToPrecision(this.velocity[0]);
        let velocityY = sc.roundToPrecision(this.velocity[1]);
        if(this.velocity[0] !== 0 && Math.abs(velocityX) < minimumSpeed){
            let fixedPositionX = sc.roundToPrecision(this.position[0] + (0 < velocityX ? 1 : -1));
            /*
            Logger.debug(
                'Speed X on "'+this.bodyLogKey()+'" is lower than minimum allowed: '
                +this.velocity[0]+' / '+minimumSpeed
                +' - Position X: '+this.position[0]+' / '+fixedPositionX
            );
            */
            this.position[0] = fixedPositionX;
            this.stopX(true);
        }
        if(this.velocity[1] !== 0 && Math.abs(velocityY) < minimumSpeed && !this.world.applyGravity){
            let fixedPositionY = this.position[1] + (0 < velocityY ? 1 : -1);
            /*
            Logger.debug(
                'Speed Y on "'+this.bodyLogKey()+'" is lower than minimum allowed: '
                +this.velocity[1]+' / '+minimumSpeed
                +' - Position Y: '+this.position[1]+' / '+fixedPositionY
            );
            */
            this.position[1] = fixedPositionY;
            this.stopY(true);
        }
        let positionX = sc.roundToPrecision(this.position[0], 0);
        let positionY = sc.roundToPrecision(this.position[1], 0);
        return this.bodyState.x === positionX && this.bodyState.y === positionY && velocityX === 0 && velocityY === 0;
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
            this.simultaneousKeyPressMovement(direction);
            return;
        }
        return this.singleKeyPressMovement(direction);
    }

    singleKeyPressMovement(direction)
    {
        // if body is moving then avoid multiple key press at the same time:
        if(direction === GameConst.RIGHT && 0 === this.velocity[1]){
            this.velocity[0] = this.movementSpeed;
        }
        if(direction === GameConst.LEFT && 0 === this.velocity[1]){
            this.velocity[0] = -this.movementSpeed;
        }
        if(direction === GameConst.UP && 0 === this.velocity[0]){
            this.moveUp(this.movementSpeed);
        }
        if(direction === GameConst.DOWN && 0 === this.velocity[0] && !this.world.applyGravity){
            this.velocity[1] = this.movementSpeed;
        }
    }

    simultaneousKeyPressMovement(direction)
    {
        if(!this.world.applyGravity){
            this.simultaneousMovementDiagonalSpeedFix(direction, this.movementSpeed);
            return;
        }
        if(direction === GameConst.RIGHT){
            this.validateAndSetDirection(direction, this.diagonalHorizontal, this.velocity[1]);
            this.velocity[0] = this.movementSpeed;
        }
        if(direction === GameConst.LEFT){
            this.validateAndSetDirection(direction, this.diagonalHorizontal, this.velocity[1]);
            this.velocity[0] = -this.movementSpeed;
        }
        if(direction === GameConst.UP){
            this.validateAndSetDirection(direction, !this.diagonalHorizontal, this.velocity[0]);
            this.moveUp(this.movementSpeed);
        }
    }

    simultaneousMovementDiagonalSpeedFix(direction, speed)
    {
        // @TODO - BETA - calculate normalized speed once and save it in the object to avoid recalculation.
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
        this.velocity[0] = 0;
        if(!this.world?.applyGravity){
            this.velocity[1] = 0;
        }
        this.angularVelocity = 0;
        this.angularForce = 0;
        this.pStop = pStop;
    }

    stopX(pStop = false)
    {
        this.velocity[0] = 0;
        this.angularVelocity = 0;
        this.angularForce = 0;
        this.pStop = pStop;
    }

    stopY(pStop = false)
    {
        this.velocity[1] = 0;
        this.angularVelocity = 0;
        this.angularForce = 0;
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
            // Logger.debug('Pathfinder not set in body.', {id: this.id, key: this.bodyState?.key});
            this.setShapesCollisionGroup(this.originalCollisionGroup);
            return false;
        }
        this.autoMoving = pathFinder.findPath(fromPoints, toPoints);
        if(!this.autoMoving){
            this.setShapesCollisionGroup(this.originalCollisionGroup);
            this.stopMove();
        }
        return this.autoMoving;
    }

    updateCurrentPoints()
    {
        // if the player disconnects, and it's the only one on the room the world would be destroyed at this point:
        if(!this.world){
            // Logger.debug('Missing world on physical body.', {id: this.id, key: this.bodyState?.key});
            return;
        }
        let {currentCol, currentRow} = this.positionToTiles(this.position[0], this.position[1]);
        if(!this.originalCol){
            // Logger.debug('Setting body ID "'+this.id+'" (key: "'+this.bodyState.key+'") original col: '+currentCol);
            this.originalCol = currentCol;
        }
        if(!this.originalRow){
            // Logger.debug('Setting body ID "'+this.id+'" (key: "'+this.bodyState.key+'") original row: '+currentRow);
            this.originalRow = currentRow;
        }
        this.currentCol = currentCol;
        this.currentRow = currentRow;
        return this;
    }

    moveToOriginalPoint()
    {
        if(!this.originalCol || !this.originalRow){
            this.updateCurrentPoints();
        }
        /*
        Logger.debug(
            'Moving body ID "'+this.id+'" (key? "'+this.bodyState.key+'") to: '+this.currentCol+' / '+this.currentRow
        );
        */
        if(this.disableObjectsCollisionsOnReturn){
            this.setShapesCollisionGroup(0);
        }
        // stop any current movement before starting a new one:
        this.stopFull();
        if(0 === this.moveToOriginalPointWithDelay){
            this.moveToPoint({column: this.originalCol, row: this.originalRow});
            return;
        }
        // introduce a small delay to ensure collision has resolved:
        this.moveToOriginalPointTimer = setTimeout(() => {
            this.moveToPoint({column: this.originalCol, row: this.originalRow});
        }, this.moveToOriginalPointWithDelay);
    }

    setShapesCollisionGroup(collisionGroup)
    {
        if(this.lastSetCollisionGroup === collisionGroup){
            return;
        }
        this.lastSetCollisionGroup = collisionGroup;
        for(let shape of this.shapes){
            // Logger.debug('Set collision group on "'+this.bodyLogKey()+'": '+collisionGroup);
            shape.collisionGroup = collisionGroup;
        }
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
