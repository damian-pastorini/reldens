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
        world.shootBullet(attacker.state, defender.state, this);
        return false;
    }

    async onHit(props)
    {
        // first run bullets hit:
        let bulletsCheck = this.executeBullets(props);
        // none bullets:
        if(!bulletsCheck){
            return false;
        }
        // get and validate defender which could be a player or an object:
        let validDefender = this.getValidDefender(props);
        // @TODO: refactor to complete the non target validation case, so the defender could be actually any player, or
        //      any object.
        if(validDefender){
            // run battle damage:
            await super.execute(this.attacker, this.defender);
            // re-run the process if pve:
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
                // update the clients if pvp:
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
        }
        return false;
    }

    executeBullets(props)
    {
        let bulletsCheck = false;
        // both objects could be bullets, so remove them is needed and broadcast the hit:
        if(props.bodyA.isBullet){
            this.removeBullet(props.bodyA);
            this.room.broadcast({act: GameConst.HIT, x: props.bodyA.position[0], y: props.bodyA.position[1]});
            bulletsCheck = true;
        }
        if(props.bodyB.isBullet){
            this.removeBullet(props.bodyB);
            this.room.broadcast({act: GameConst.HIT, x: props.bodyB.position[0], y: props.bodyB.position[1]});
            bulletsCheck = true;
        }
        return bulletsCheck;
    }

    getValidDefender(props)
    {
        // we already validate if one of the bodies is a bullet so the other will be always a player or an object:
        let validDefender = false;
        // target defender is an object:
        if({}.hasOwnProperty.call(this.defender, 'objectBody')){
            validDefender = props.bodyA.id === this.defender.objectBody.id ? props.bodyA :
                (props.bodyB.id === this.defender.objectBody.id ? props.bodyB : false);
        }
        // target defender is a player:
        if({}.hasOwnProperty.call(this.defender, 'player_id')){
            let defenderBody = {}.hasOwnProperty.call(props.bodyA, 'playerId') ? props.bodyA :
                ({}.hasOwnProperty.call(props.bodyB, 'playerId') ? props.bodyB : false);
            if(defenderBody && (!this.validateTargetById || defenderBody.playerId === this.defender.sessionId)){
                validDefender = defenderBody;
            }
        }
        return validDefender;
    }

    removeBullet(body)
    {
        body.world.removeBodies.push(body);
        delete this.room.state.bodies['bullet'+body.id];
    }

}

module.exports.AttackBullet = AttackBullet;
