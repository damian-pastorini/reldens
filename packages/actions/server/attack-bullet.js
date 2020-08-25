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
        this.validateTargetId = {}.hasOwnProperty.call(props, 'validateTargetId') ? props.validateTargetId : false;
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
        let notTheBullet = bulletsCheck[0].key === 'bodyA' ? 'bodyB' : 'bodyA';
        // none bullets or both bullets:
        if(bulletsCheck.length !== 1){
            // @TODO: implement bullets bodies without collisions between each other.
            return false;
        }
        // get and validate defender which could be a player or an object:
        let validDefender = this.getValidDefender(props, notTheBullet);
        if(validDefender){
            // override defender only if target validation is disabled:
            if(!this.validateTargetId){
                this.defender = validDefender;
            }
            // run battle damage:
            await super.execute(this.attacker, validDefender);
            // re-run the process if pve:
            if(
                {}.hasOwnProperty.call(this.attacker, 'player_id')
                && {}.hasOwnProperty.call(validDefender, 'objectBody')
                && this.currentBattle
            ){
                if(validDefender.stats.hp > 0){
                    if(!this.validateTargetId){
                        // if target validation is disabled then any target could start the battle (pve):
                        if({}.hasOwnProperty.call(validDefender, 'battle')){
                            validDefender.battle.targetObject = validDefender;
                            await validDefender.battle.startBattleWith(this.attacker, this.room);
                        }
                    } else {
                        // if target validation is enabled then we can only start the battle with the target:
                        await this.currentBattle.startBattleWith(this.attacker, this.room);
                    }
                } else {
                    await this.currentBattle.battleEnded(this.attacker, this.room);
                }
            } else {
                // update the clients if pvp:
                if({}.hasOwnProperty.call(validDefender, 'player_id')){
                    let targetClient = this.room.getClientById(validDefender.sessionId);
                    if(targetClient){
                        await this.currentBattle.updateTargetClient(
                            targetClient,
                            validDefender,
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
        let bulletsCheck = [];
        // both objects could be bullets, so remove them is needed and broadcast the hit:
        if(props.bodyA.isBullet){
            this.removeBullet(props.bodyA);
            this.room.broadcast({act: GameConst.HIT, x: props.bodyA.position[0], y: props.bodyA.position[1]});
            bulletsCheck.push({key: 'bodyA', obj: props.bodyA});
        }
        if(props.bodyB.isBullet){
            this.removeBullet(props.bodyB);
            this.room.broadcast({act: GameConst.HIT, x: props.bodyB.position[0], y: props.bodyB.position[1]});
            bulletsCheck.push({key: 'bodyB', obj: props.bodyB});
        }
        return bulletsCheck;
    }

    getValidDefender(props, defenderBodyKey)
    {
        // we already validate if one of the bodies is a bullet so the other will be always a player or an object:
        let validDefender = false;
        if(this.validateTargetId){
            // target defender is an object:
            if(
                {}.hasOwnProperty.call(this.defender, 'objectBody')
                && {}.hasOwnProperty.call(props[defenderBodyKey], 'roomObject')
                && props[defenderBodyKey].roomObject.id === this.defender.id
            ){
                validDefender = this.defender;
            }
            // target defender is a player:
            if(
                {}.hasOwnProperty.call(this.defender, 'player_id')
                && {}.hasOwnProperty.call(props[defenderBodyKey], 'playerId')
                && props[defenderBodyKey].playerId === this.defender.sessionId
            ){
                validDefender = this.defender;
            }
        } else {
            // target defender is a player:
            if({}.hasOwnProperty.call(props[defenderBodyKey], 'playerId')){
                validDefender = this.room.state.players[props[defenderBodyKey].playerId];
            } else {
                // target defender is an object:
                validDefender = props[defenderBodyKey].roomObject;
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
