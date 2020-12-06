/**
 *
 * Reldens - TypePhysicalAttack
 *
 * Base physical attack ("bullet" like). This skill will use a world object and collisions to validate the target and
 * hit.
 *
 */

const { PhysicalAttack } = require('@reldens/skills');
const { GameConst } = require('../../../game/constants');
const { sc } = require('@reldens/utils');

class TypePhysicalAttack extends PhysicalAttack
{

    constructor(props)
    {
        super(props);
        this.room = false;
        this.currentBattle = false;
        // @NOTE: hit priority is something specifically from reldens physics engine, in order to change this value you
        // need to extend this class and send a new one as parameter in the constructor.
        this.hitPriority = sc.hasOwn(props, 'hitPriority') ? props.hitPriority : 2;
    }

    async onHit(props)
    {
        // first run bullets hit:
        let bulletsCheck = this.executeBullets(props);
        let notTheBullet = bulletsCheck[0].key === 'bodyA' ? 'bodyB' : 'bodyA';
        // none bullets or both bullets:
        if(bulletsCheck.length !== 1){
            // @TODO - BETA.17: implement bullets bodies without collisions between each other.
            return false;
        }
        // get and validate defender which could be a player or an object:
        let validDefender = this.getValidDefender(props, notTheBullet);
        if(validDefender){
            // run battle damage:
            await super.executeOnHit(validDefender);
            // re-run the process if pve:
            if(
                sc.hasOwn(this.owner, 'player_id')
                && sc.hasOwn(validDefender, 'objectBody')
                && this.currentBattle
            ){
                // @TODO - BETA.16 - R16-2: replace hp by the defender affected attribute from the skills system.
                if(validDefender.stats.hp > 0){
                    if(!this.validateTargetOnHit){
                        // if target validation is disabled then any target could start the battle (pve):
                        if(sc.hasOwn(validDefender, 'battle')){
                            validDefender.battle.targetObject = validDefender;
                            await validDefender.battle.startBattleWith(this.owner, this.room);
                        }
                    } else {
                        // if target validation is enabled then we can only start the battle with the target:
                        await this.currentBattle.startBattleWith(this.owner, this.room);
                    }
                } else {
                    // battle ended checkpoint:
                    await this.currentBattle.battleEnded(this.owner, this.room);
                }
            } else {
                // update the clients if pvp:
                if(sc.hasOwn(validDefender, 'player_id')){
                    let targetClient = this.room.getClientById(validDefender.broadcastKey);
                    if(targetClient){
                        await this.currentBattle.updateTargetClient(
                            targetClient,
                            validDefender,
                            this.owner.sessionId,
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
        return sc.hasOwn(props[defenderBodyKey], 'playerId') ?
            this.room.state.players[props[defenderBodyKey].playerId] : props[defenderBodyKey].roomObject;
    }

    removeBullet(body)
    {
        body.world.removeBodies.push(body);
        delete this.room.state.bodies['bullet'+body.id];
    }

}

module.exports = TypePhysicalAttack;
