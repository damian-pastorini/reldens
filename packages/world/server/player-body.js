/**
 *
 * Reldens - PlayerBody
 *
 * Extended the physics P2js Body to easily update the player state schema and get all bodies position updated
 * automatically.
 *
 */

const { Body, vec2 } = require('p2');
const { GameConst } = require('../../game/constants');

class PlayerBody extends Body
{

    constructor(options)
    {
        super(options);
        this.playerState = {};
        this.animationBasedOnPress = options.animationBasedOnPress;
        this.diagonalHorizontal = options.diagonalHorizontal;
        this.autoMoving = false;
        // default or initial direction:
        this.pressedDirection = GameConst.DOWN;
    }

    integrate(dt)
    {
        let minv = this.invMass,
            f = this.force,
            pos = this.position,
            velo = this.velocity;
        // save old position
        vec2.copy(this.previousPosition, this.position);
        this.previousAngle = this.angle;
        // velocity update
        if(!this.fixedRotation){
            this.angularVelocity += this.angularForce * this.invInertia * dt;
        }
        let integrate_fhMinv = vec2.create();
        vec2.scale(integrate_fhMinv, f, dt * minv);
        vec2.multiply(integrate_fhMinv, this.massMultiplier, integrate_fhMinv);
        vec2.add(velo, integrate_fhMinv, velo);
        // CCD
        if(!this.integrateToTimeOfImpact(dt)){
            let integrate_velodt = vec2.create();
            // regular position update
            vec2.scale(integrate_velodt, velo, dt);
            vec2.add(pos, pos, integrate_velodt);
            if(!this.fixedRotation){
                this.angle += this.angularVelocity * dt;
            }
        }
        if(this.autoMoving.length){
            this.speedToNext(pos);
        }
        if(this.playerState){
            this.updatePlayerState();
        }
        this.aabbNeedsUpdate = true;
    }

    speedToNext()
    {
        // @TODO: this can be improved but for now we can use the cols and rows to follow the path since it doesn't
        //   needs to be an exact method (it is not the user is choosing each point of the path to follow). In order to
        //   make it more accurate we need to use the position, but with the current configuration it will be also an
        //   approximation since there it has issues between the world step and the objects speed, where the position
        //   is passed in between steps.
        //   Additionally we still need to include the position fix for the cases where the moving object is bigger
        //   than a single tile.
        if(this.currentCol === this.autoMoving[0][0] && this.currentRow === this.autoMoving[0][1]){
            // if the point was reach then remove it to process the next one:
            this.autoMoving.shift();
            if(!this.autoMoving.length){
                // if there are no more points to process then stop the body and reset the path:
                this.velocity = [0, 0];
                this.resetAuto();
            }
        } else {
            if(this.currentCol === this.autoMoving[0][0]){
                this.velocity[0] = 0;
            }
            if(this.currentCol > this.autoMoving[0][0]){
                this.initMove(GameConst.LEFT, true);
            }
            if(this.currentCol < this.autoMoving[0][0]){
                this.initMove(GameConst.RIGHT, true);
            }
            if(this.currentRow === this.autoMoving[0][1]){
                this.velocity[1] = 0;
            }
            if(this.currentRow > this.autoMoving[0][1]){
                this.initMove(GameConst.UP, true);
            }
            if(this.currentRow < this.autoMoving[0][1]){
                this.initMove(GameConst.DOWN, true);
            }
            this.currentCol = Math.floor(this.position[0] / this.world.mapJson.tilewidth);
            this.currentRow = Math.floor(this.position[1] / this.world.mapJson.tileheight);
        }
    }

    updatePlayerState()
    {
        // update position:
        this.playerState.x = this.position[0];
        this.playerState.y = this.position[1];
        // start or stop animation:
        this.playerState.mov = (this.velocity[0] !== 0 || this.velocity[1] !== 0);
    }

    resetAuto()
    {
        this.autoMoving = [];
    }

    initMove(direction, isAuto = false)
    {
        if(!isAuto){
            // if user moves the player then reset the auto move.
            this.resetAuto();
        }
        let speed = this.world.worldSpeed;
        if(this.world.allowSimultaneous){
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
                this.velocity[1] = -speed;
            }
            if(direction === GameConst.DOWN){
                this.validateAndSetDirection(direction, !this.diagonalHorizontal, this.velocity[0]);
                this.velocity[1] = speed;
            }
        } else {
            // if body is moving then avoid multiple key press at the same time:
            if(direction === GameConst.RIGHT && this.velocity[1] === 0){
                this.velocity[0] = speed;
            }
            if(direction === GameConst.LEFT && this.velocity[1] === 0){
                this.velocity[0] = -speed;
            }
            if(direction === GameConst.UP && this.velocity[0] === 0){
                this.velocity[1] = -speed;
            }
            if(direction === GameConst.DOWN && this.velocity[0] === 0){
                this.velocity[1] = speed;
            }
        }
    }

    validateAndSetDirection(direction, diagonal, velocity)
    {
        if(this.animationBasedOnPress){
            if(diagonal || velocity === 0){
                this.playerState.dir = direction;
            }
        }
    }

    stopMove()
    {
        // stop by setting speed to zero:
        this.velocity = [0, 0];
    }

    moveToPoint(toPoint)
    {
        this.resetAuto();
        this.currentCol = Math.floor(this.position[0] / this.world.mapJson.tilewidth);
        this.currentRow = Math.floor(this.position[1] / this.world.mapJson.tileheight);
        this.autoMoving = this.world.pathFinder.findPath([this.currentCol, this.currentRow], [toPoint.column, toPoint.row]);
    }

}

module.exports.PlayerBody = PlayerBody;
