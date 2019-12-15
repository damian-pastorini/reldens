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
    }

    integrate(dt)
    {
        let minv = this.invMass,
            f = this.force,
            pos = this.position,
            velo = this.velocity;
        // Save old position
        vec2.copy(this.previousPosition, this.position);
        this.previousAngle = this.angle;
        // Velocity update
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
            // Regular position update
            vec2.scale(integrate_velodt, velo, dt);
            vec2.add(pos, pos, integrate_velodt);
            if(!this.fixedRotation){
                this.angle += this.angularVelocity * dt;
            }
        }
        if(this.playerState){
            // update position:
            this.playerState.x = this.position[0];
            this.playerState.y = this.position[1];
            // start or stop animation:
            this.playerState.mov = (this.velocity[0] !== 0 || this.velocity[1] !== 0);
        }
        this.aabbNeedsUpdate = true;
    }

    initMove(direction, speed, allowSimultaneous = false)
    {
        if(allowSimultaneous){
            if(direction === GameConst.RIGHT){
                this.velocity[0] = speed;
            }
            if(direction === GameConst.LEFT){
                this.velocity[0] = -speed;
            }
            if(direction === GameConst.UP){
                this.velocity[1] = -speed;
            }
            if(direction === GameConst.DOWN){
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

    stopMove()
    {
        // stop by setting speed to zero:
        this.velocity = [0, 0];
    }

}

module.exports.PlayerBody = PlayerBody;
