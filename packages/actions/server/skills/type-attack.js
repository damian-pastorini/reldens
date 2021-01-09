/**
 *
 * Reldens - TypeAttack
 *
 * Base attack skill class.
 *
 */

const { Attack } = require('@reldens/skills');
const { sc } = require('@reldens/utils');

class TypeAttack extends Attack
{

    constructor(props)
    {
        super(props);
        this.room = false;
        this.currentBattle = false;
    }

    async runSkillLogic()
    {
        if(this.room){
            // @TODO - BETA.17 - Replace all the defaults by constants.
            let skillAction = this.key+'_atk';
            this.room.broadcast({
                act: skillAction,
                owner: this.owner.broadcastKey,
                target: this.target.broadcastKey
            });
        }
        await super.runSkillLogic();
        if(sc.hasOwn(this.owner, 'player_id') && sc.hasOwn(this.target, 'objectBody') && this.currentBattle){
            if(this.getAffectedPropertyValue(this.target) > 0){
                await this.currentBattle.startBattleWith(this.owner, this.room);
            }
        }
        return true;
    }

}

module.exports = TypeAttack;
