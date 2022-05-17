/**
 *
 * Reldens - Effect
 *
 * Base effect skill class.
 *
 */

const { Effect } = require('@reldens/skills');
const { sc } = require('@reldens/utils');

class TypeEffect extends Effect
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
            let skillAction = this.key+'_eff';
            this.room.broadcast('game-message', {
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
