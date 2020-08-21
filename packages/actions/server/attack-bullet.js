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

class AttackBullet extends AttackBase
{

    constructor(props)
    {
        if(!props){
            props = {};
        }
        // @TODO: all the attack configuration will be coming from the database.
        super({
            skillDelay: {}.hasOwnProperty.call(props, 'skillDelay') ? props.skillDelay : 1000,
            key: {}.hasOwnProperty.call(props, 'key') ? props.key : 'attack-bullet',
            canActivate: {}.hasOwnProperty.call(props, 'canActivate') ? props.canActivate : true,
            range: {}.hasOwnProperty.call(props, 'range') ? props.range : 250,
            hitDamage: {}.hasOwnProperty.call(props, 'hitDamage') ? props.hitDamage : 3
        });
        this.attacker = false;
        this.defender = false;
        this.hitPriority = {}.hasOwnProperty.call(props, 'hitPriority') ? props.hitPriority : 2;
        this.magnitude = {}.hasOwnProperty.call(props, 'magnitude') ? props.magnitude : 350;
        this.bulletW = {}.hasOwnProperty.call(props, 'bulletW') ? props.bulletW : 5;
        this.bulletH = {}.hasOwnProperty.call(props, 'bulletH') ? props.bulletH : 5;
    }

    async execute(attacker, defender)
    {
        let world = {}.hasOwnProperty.call(attacker, 'physicalBody')
            ? attacker.physicalBody.world : attacker.objectBody.world;
        this.attacker = attacker;
        this.defender = defender;
        // return this.shootBullet(attacker.state, defender.state, world);
        world.shootBullet(attacker.state, defender.state, this);
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
            } else {
                if({}.hasOwnProperty.call(this.defender, 'player_id')){
                    let targetClient = this.room.getClientById(this.defender.sessionId);
                    if(targetClient){
                        await this.currentBattle.updateTargetClient(
                            targetClient,
                            this.defender,
                            this.attacker.sessionId,
                            this.room
                        );
                    }
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
