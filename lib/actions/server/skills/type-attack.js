/**
 *
 * Reldens - TypeAttack
 *
 * Handles attack-type skills with room broadcast and battle initiation.
 *
 */

const { Attack } = require('@reldens/skills');
const { sc } = require('@reldens/utils');

class TypeAttack extends Attack
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
    }

    /**
     * @returns {Promise<boolean>}
     */
    async runSkillLogic()
    {
        if(this.room){
            // @TODO - BETA - Replace all the defaults by constants.
            let skillAction = this.key+'_atk';
            this.room.broadcast('*', {
                act: skillAction,
                owner: this.owner.broadcastKey,
                target: this.target.broadcastKey
            });
        }
        await super.runSkillLogic();
        if(
            sc.hasOwn(this.owner, 'player_id')
            && sc.hasOwn(this.target, 'objectBody')
            && this.currentBattle
            && 0 < this.getAffectedPropertyValue(this.target)
        ){
            await this.currentBattle.startBattleWith(this.owner, this.room);
        }
        return true;
    }

}

module.exports = TypeAttack;
