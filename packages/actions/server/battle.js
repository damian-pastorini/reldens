/**
 *
 * Reldens - Battle
 *
 * Battle logic handler.
 *
 */

const { BattleConst } = require('../constants');

class Battle
{

    constructor()
    {
        // the same body can be in battle with multiple bodies:
        this.inBattleWith = [];
        // @NOTE: set the battleTimeOff = false will disable the battle mode timer. Battle mode can be use to implement
        // specific behaviors.
        this.battleTimeOff = false;
        this.battleTimer = false;
        this.lastAttack = false;
        this.timerType = BattleConst.BATTLE_TYPE_PER_TARGET;
    }

    async runBattle(playerSchema, target)
    {
        // @NOTE: each attack will have different properties to validate like range, delay, etc.
        // @TODO: temporal hardcoded single action "short-attack".
        if(!playerSchema.actions['attack-short'].validate(playerSchema, target)){
            return false;
        }
        // execute and apply the attack:
        await playerSchema.actions['attack-short'].execute(playerSchema, target);
        // include the target in the battle list:
        this.lastAttack = Date.now();
        this.inBattleWith[target.id] = {target: target, time: this.lastAttack, battleTimer: false};
        let useTimerObj = this; // BattleConst.BATTLE_TYPE_GENERAL
        if(this.timerType === BattleConst.BATTLE_TYPE_PER_TARGET){
            useTimerObj = this.inBattleWith[target.id];
        }
        this.setTimerOn(useTimerObj, target);
        return true;
    }

    setTimerOn(useTimerObj, target)
    {
        if(useTimerObj.battleTimer){
            clearTimeout(useTimerObj.battleTimer);
        }
        if(this.battleTimeOff){
            useTimerObj.battleTimer = setTimeout(() => {
                delete this.inBattleWith[target.id];
            }, this.battleTimeOff);
        }
    }

}

module.exports.Battle = Battle;
