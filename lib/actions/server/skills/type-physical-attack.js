/**
 *
 * Reldens - TypePhysicalAttack
 *
 */

const { PhysicalAttack } = require('@reldens/skills');
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
        this.hitPriority = sc.get(props, 'hitPriority', 2);
        // the animation direction is a custom property on the skill calculated on the server to be sent to the client:
        this.animDir = sc.get(props, 'animDir', false);
    }

    async onHit(props)
    {
        // first run bullets hit:
        let bulletsCheck = this.executeBullets(props);
        // if we have 0 bullets or both bodies are bullets then we can skip the bullet hit check:
        if(1 !== bulletsCheck.length){
            // @TODO - BETA - Implement bullets bodies without collisions between each other.
            return false;
        }
        let notTheBullet = 'body'+(bulletsCheck.shift().key === 'A' ? 'B' : 'A');
        // get and validate defender which could be a player or an object:
        let validDefender = this.getValidDefender(props, notTheBullet);
        if(!validDefender){
            return false;
        }
        // run battle damage:
        await super.executeOnHit(validDefender);
        if(!validDefender?.state){
            // Logger.info('Invalid defender, none State.', {key: validDefender?.key});
            return false;
        }
        let hitKey = this.key+'_hit';
        let hitMessage = {
            act: hitKey,
            x: validDefender.state.x,
            y: validDefender.state.y,
            owner: this.owner.broadcastKey,
            target: validDefender.broadcastKey
        };
        this.room.broadcast('*', hitMessage);
        if(sc.hasOwn(this.owner, 'player_id') && sc.hasOwn(validDefender, 'objectBody') && this.currentBattle){
            return await this.startPvE(validDefender);
        }
        return await this.sendUpdateFromPvP(validDefender);
    }

    async sendUpdateFromPvP(validDefender)
    {
        // update the clients if pvp:
        if(!sc.hasOwn(validDefender, 'player_id')){
            return false;
        }
        let targetClient = this.room.getClientById(validDefender.broadcastKey);
        if(!targetClient){
            return false;
        }
        await this.currentBattle.updateTargetClient(
            targetClient,
            validDefender,
            this.owner.sessionId,
            this.room
        );
    }

    async startPvE(validDefender)
    {
        if(0 < validDefender.stats[this.room.config.get('client/actions/skills/affectedProperty')]){
            return await this.restartBattle(validDefender);
        }
        return await this.currentBattle.battleEnded(this.owner, this.room);
    }

    async restartBattle(validDefender)
    {
        if(!this.validateTargetOnHit && sc.hasOwn(validDefender, 'battle')){
            // if target validation is disabled then any target could start the battle (pve):
            validDefender.battle.targetObject = validDefender;
            await validDefender.battle.startBattleWith(this.owner, this.room);
            return;
        }
        // if target validation is enabled then we can only start the battle with the target:
        await this.currentBattle.startBattleWith(this.owner, this.room);
    }

    executeBullets(props)
    {
        let bulletsCheck = [];
        // @TODO - BETA - Replace all the defaults by constants.
        // both objects could be bullets, so remove them is needed and broadcast the hit:
        if(props.bodyA.isBullet){
            this.removeBullet(props.bodyA);
            bulletsCheck.push({key: 'bodyA', obj: props.bodyA});
        }
        if(props.bodyB.isBullet){
            this.removeBullet(props.bodyB);
            bulletsCheck.push({key: 'bodyB', obj: props.bodyB});
        }
        return bulletsCheck;
    }

    getValidDefender(props, defenderBodyKey)
    {
        // we already validate if one of the bodies is a bullet so the other will be always a player or an object:
        let playerId = sc.get(props[defenderBodyKey], 'playerId', null);
        if(null !== playerId){
            return this.room.playerBySessionIdFromState(playerId);
        }
        return props[defenderBodyKey].roomObject;
    }

    removeBullet(body)
    {
        body.world.removeBodies.push(body);
        delete this.room.state.bodies[this.key+'_bullet_'+body.id];
    }

}

module.exports = TypePhysicalAttack;
