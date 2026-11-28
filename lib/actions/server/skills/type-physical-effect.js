/**
 *
 * Reldens - TypePhysicalEffect
 *
 * Handles physical effect skills with collision detection, bullets, and PvE/PvP logic. A bullet that hits a room object
 * with no stats (an NPC, a door, a mining rock, a chest) only ends: no effect, no hit broadcast and no battle.
 *
 */

const { PhysicalEffect } = require('@reldens/skills');
const { sc } = require('@reldens/utils');

class TypePhysicalEffect extends PhysicalEffect
{

    /**
     * @param {Object} props
     */
    constructor(props)
    {
        super(props);
        /** @type {any|false} */
        this.room = false;
        /** @type {any|false} */
        this.currentBattle = false;
        /** @type {number} */
        this.hitPriority = sc.get(props, 'hitPriority', 2);
        /** @type {any|false} */
        this.animDir = sc.get(props, 'animDir', false);
    }

    /**
     * @param {Object} props
     * @returns {Promise<boolean>}
     */
    async onHit(props)
    {
        // run bullets hit:
        let bulletsCheck = this.executeBullets(props);
        // none bullets or both bullets:
        if(1 !== bulletsCheck.length){
            // @TODO - BETA - Implement bullets bodies without collisions between each other.
            return false;
        }
        let notTheBullet = 'bodyA' === bulletsCheck.shift().key ? 'bodyB' : 'bodyA';
        // get and validate a defender which could be a player or an object:
        let validDefender = this.getValidDefender(props, notTheBullet);
        if(!validDefender){
            return false;
        }
        // run battle damage:
        await super.executeOnHit(validDefender);
        let hitKey = this.key+'_hit';
        this.room.broadcast('*', {
            act: hitKey,
            x: props[notTheBullet].position[0],
            y: props[notTheBullet].position[1],
            owner: this.owner.broadcastKey,
            target: validDefender.broadcastKey
        });
        if(sc.hasOwn(this.owner, 'player_id') && sc.hasOwn(validDefender, 'objectBody') && this.currentBattle){
            await this.startPvE(validDefender);
            return false;
        }
        await this.sendUpdateFromPvP(validDefender);
        return false;
    }

    /**
     * @param {Object} validDefender
     * @returns {Promise<boolean|void>}
     */
    async sendUpdateFromPvP(validDefender)
    {
        if(!sc.hasOwn(validDefender, 'player_id')){
            return false;
        }
        let targetClient = this.room.getClientById(validDefender.broadcastKey);
        if(!targetClient){
            return false;
        }
        await this.currentBattle.updateTargetClient(targetClient, validDefender, this.room, this.owner);
    }

    /**
     * @param {Object} validDefender
     * @returns {Promise<any>}
     */
    async startPvE(validDefender)
    {
        if(0 < validDefender.stats[this.room.config.get('client/actions/skills/affectedProperty')]){
            return await this.restartBattle(validDefender);
        }
        return await this.currentBattle.battleEnded(this.owner, this.room);
    }

    /**
     * @param {Object} validDefender
     * @returns {Promise<void>}
     */
    async restartBattle(validDefender)
    {
        if(!this.validateTargetOnHit && sc.hasOwn(validDefender, 'battle')){
            if(!validDefender.battle){
                return;
            }
            // if target validation is disabled, then any target could start the battle (pve):
            validDefender.battle.targetObject = validDefender;
            await validDefender.battle.startBattleWith(this.owner, this.room);
            return;
        }
        // if target validation is enabled then we can only start the battle with the target:
        await this.currentBattle.startBattleWith(this.owner, this.room);
    }

    /**
     * @param {Object} props
     * @returns {Array}
     */
    executeBullets(props)
    {
        let bulletsCheck = [];
        // @TODO - BETA - Replace all the defaults by constants.
        // both objects could be bullets, so remove them is needed and broadcast the hit:
        if(props.bodyA.isBullet){
            this.removeBullet(props.bodyA);
            bulletsCheck.push({key: 'bodyA'});
        }
        if(props.bodyB.isBullet){
            this.removeBullet(props.bodyB);
            bulletsCheck.push({key: 'bodyB'});
        }
        return bulletsCheck;
    }

    /**
     * @param {Object} props
     * @param {string} defenderBodyKey
     * @returns {Object|boolean}
     */
    getValidDefender(props, defenderBodyKey)
    {
        // we already validate if one of the bodies is a bullet, so the other will always be a player or an object:
        if(sc.hasOwn(props[defenderBodyKey], 'playerId')){
            return this.room.playerBySessionIdFromState(props[defenderBodyKey].playerId);
        }
        return sc.hasOwn(props[defenderBodyKey].roomObject, 'stats') ? props[defenderBodyKey].roomObject : false;
    }

    /**
     * @param {Object} body
     */
    removeBullet(body)
    {
        body.world.removeBodies.push(body);
        // @TODO - BETA - Refactor and extract Colyseus into a driver. Check is been used?
        this.room.state.removeBody(this.key+'_bullet_'+body.id);
    }

}

module.exports = TypePhysicalEffect;
