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
            // @TODO - BETA - Replace all the defaults by constants.
            let skillAction = this.key+'_atk';
            this.room.broadcast({
                act: skillAction,
                owner: this.owner.broadcastKey,
                target: this.target.broadcastKey
            });
        }
        await super.runSkillLogic();
        if(sc.hasOwn(this.owner, 'player_id') && sc.hasOwn(this.target, 'objectBody') && this.currentBattle){
            if(0 < this.getAffectedPropertyValue(this.target)){
                await this.currentBattle.startBattleWith(this.owner, this.room);
            }
        }
        return true;
    }

}

module.exports = TypeAttack;
