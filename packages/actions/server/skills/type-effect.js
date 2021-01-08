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
            let effKey = this.key+'_eff';
            let skillAction = effKey; // sc.hasOwn(this.room.config.client.skills.animations, effKey) ? effKey : 'default_eff';
            this.room.broadcast({
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
