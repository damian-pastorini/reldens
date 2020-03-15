/**
 *
 * Reldens - AttackBullet
 *
 * Basic long distance attack as "bullet", this attack will use a world object and collisions to validate the target
 * and hit.
 *
 */

const { AttackBase } = require('./attack-base');
const { GameConst } = require('../../game/constants');
const { Body } = require('p2');

class AttackBullet extends AttackBase
{

    constructor()
    {
        // @TODO: all the attack configuration will be coming from the database.
        super({
            attackDelay: 1000,
            key: 'attack-bullet',
            canAttack: true,
            range: 250,
            hitDamage: 3
        });
        this.attacker = false;
        this.defender = false;
        this.hitPriority = 2;
    }

    async execute(attacker, defender)
    {
        // @TODO: shoot bullet on world starting from attacker body, pass this attack as parameter assign it to the
        //   body and execute the attack when the bullet collides.
        let world = {}.hasOwnProperty.call(attacker, 'physicalBody')
            ? attacker.physicalBody.world : attacker.objectBody.world;
        this.attacker = attacker;
        this.defender = defender;
        return this.shootBullet(attacker.state, defender.state, world);
    }

    shootBullet(fromPosition, toPosition, world)
    {
        let magnitude = 350;
        let bulletW = 30;
        let bulletH = 30;
        let bulletY = fromPosition.y + ((toPosition.y > fromPosition.y) ? bulletW : -bulletW);
        let bulletX = fromPosition.x + ((toPosition.x > fromPosition.x) ? bulletW : -bulletW);
        let y = toPosition.y - bulletY;
        let x = toPosition.x - bulletX;
        let angleByVelocity = Math.atan2(y, x);
        let bulletBody = world.createCollisionBody(bulletW, bulletH, bulletX, bulletY, 1, true, true);
        bulletBody.shapes[0].collisionGroup = GameConst.COL_PLAYER;
        bulletBody.shapes[0].collisionMask = GameConst.COL_ENEMY | GameConst.COL_GROUND | GameConst.COL_PLAYER;
        bulletBody.type = Body.DYNAMIC;
        bulletBody.updateMassProperties();
        bulletBody.isRoomObject = true;
        bulletBody.roomObject = this;
        bulletBody.hitPriority = this.hitPriority;
        bulletBody.isBullet = true;
        // append body to world:
        world.addBody(bulletBody);
        // and state on room map schema:
        // @TODO: this index here will be the animation key since the bullet state doesn't have a key property.
        this.room.state.bodies['bullet'+bulletBody.id] = bulletBody.bodyState;
        // then speed up in the target direction:
        bulletBody.angle = Math.atan2(y, x) * 180 / Math.PI;
        bulletBody.velocity[0] = magnitude * Math.cos(angleByVelocity);
        bulletBody.velocity[1] = magnitude * Math.sin(angleByVelocity);
        // since the enemy won't be hit until the bullet reach the target we need to return false to avoid the onHit
        // automatic actions (for example pve init).
        return false;
    }

    // props will receive an object with the hit data:
    async onHit(props)
    {
        // @TODO: clean up and simplify.
        let execute = false;
        // if the hit has a player then the second body will be always the bullet:
        if({}.hasOwnProperty.call(props, 'playerBody')){
            // @TODO: validate if current hit is the target player.
            // bullet hit player: {playerBody: playerBody, objectBody: otherBody, room: this.room}
            this.removeBullet(props.objectBody);
            execute = true;
        }
        // if both bodies are non-players bodies and the defender is also an object then validate if the hit object is
        // the same registered as defender:
        if(
            {}.hasOwnProperty.call(props, 'bodyA')
            && {}.hasOwnProperty.call(props, 'bodyB')
            // @NOTE: defender could be a player and don't have an objectBody.
            && {}.hasOwnProperty.call(this.defender, 'objectBody')
        ){
            // bullet hit object: {bodyA: bodyA, bodyB: bodyB, room: this.room}
            // if one body is the bullet we need to validate that the second one is the target object (or defender):
            if(props.bodyA.isBullet && props.bodyB.id === this.defender.objectBody.id){
                this.removeBullet(props.bodyA);
                execute = true;
            }
            if(props.bodyB.isBullet && props.bodyA.id === this.defender.objectBody.id){
                this.removeBullet(props.bodyB);
                execute = true;
            }
        }
        if(execute){
            this.room.broadcast({act: GameConst.HIT, x: this.defender.state.x, y: this.defender.state.y});
            await super.execute(this.attacker, this.defender);
            if(
                {}.hasOwnProperty.call(this.attacker, 'player_id')
                && {}.hasOwnProperty.call(this.defender, 'objectBody')
                && this.currentBattle
            ){
                if(this.defender.stats.hp > 0){
                    await this.currentBattle.startBattleWith(this.attacker, this.room);
                } else {
                    await this.currentBattle.battleEnded(this.attacker, this.room);
                }
            }
        } else {
            // the bullet hit something else:
            let bulletBody = props.bodyA.isBullet ? props.bodyA : props.bodyB;
            // destroy the bullet and run the hit animation:
            this.removeBullet(bulletBody);
            this.room.broadcast({act: GameConst.HIT, x: bulletBody.position[0], y: bulletBody.position[1]});
        }
        return false;
    }

    removeBullet(body)
    {
        body.world.removeBodies.push(body);
        delete this.room.state.bodies['bullet'+body.id];
    }

}

module.exports.AttackBullet = AttackBullet;
