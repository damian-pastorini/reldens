/**
 *
 * Reldens - Effect
 *
 * Base effect skill class.
 *
 */

const { Effect } = require('@reldens/skills');

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
            this.room.broadcast({
                act: this.key,
                owner: this.owner.broadcastKey,
                target: this.target.broadcastKey
            });
        }
        await super.runSkillLogic();
        if(
            {}.hasOwnProperty.call(this.owner, 'player_id')
            && {}.hasOwnProperty.call(this.target, 'objectBody')
            && this.currentBattle
        ){
            if(this.getAffectedPropertyValue(this.target) > 0){
                await this.currentBattle.startBattleWith(this.owner, this.room);
            } else {
                await this.currentBattle.battleEnded(this.owner, this.room);
            }
        }
        return true;
    }

}

module.exports = TypeEffect;
