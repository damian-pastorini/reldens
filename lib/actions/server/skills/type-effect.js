/**
 *
 * Reldens - TypeEffect
 *
 * Handles effect-type skills with room broadcast and battle initiation.
 *
 */

const { Effect } = require('@reldens/skills');
const { sc } = require('@reldens/utils');

class TypeEffect extends Effect
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
            let skillAction = this.key+'_eff';
            this.room.broadcast('*', {
                act: skillAction,
                owner: this.owner.broadcastKey,
                target: this.target.broadcastKey
            });
        }
        await super.runSkillLogic();
        if(sc.hasOwn(this.owner, 'player_id') && sc.hasOwn(this.target, 'objectBody') && this.currentBattle){
            await this.currentBattle.startBattleWith(this.owner, this.room);
        }
        return true;
    }

}

module.exports = TypeEffect;
