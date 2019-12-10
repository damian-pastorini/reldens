/**
 *
 * Reldens - PlayerBody
 *
 * Extended the physics P2js Body to easily update the player state schema and get all bodies position updated
 * automatically.
 *
 */

const { Body } = require('p2');
const vec2 = require('p2/src/math/vec2');

class PlayerBody extends Body
{

    playerState = false;

    constructor(options)
    {
        super(options);
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
            this.playerState.x = this.position[0];
            this.playerState.y = this.position[1];
        }
        this.aabbNeedsUpdate = true;
    }

}

module.exports.PlayerBody = PlayerBody;
