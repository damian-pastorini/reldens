/**
 *
 * Reldens - Battle
 *
 * Battle logic handler.
 *
 */

const { BattleConst } = require('../constants');
const { GameConst } = require('../../game/constants');

class Battle
{

    constructor(props)
    {
        // the same player can be in battle with multiple bodies:
        this.inBattleWith = {};
        // @NOTE: set the battleTimeOff = false will disable the battle mode timer. Battle mode can be use to implement
        // specific behaviors.
        this.battleTimeOff = props.battleTimeOff || false;
        this.battleTimer = false;
        this.timerType = props.timerType || BattleConst.BATTLE_TYPE_PER_TARGET;
        this.lastAttack = false;
        this.pvType = false;
    }

    async runBattle(playerSchema, target)
    {
        // @NOTE: each attack will have different properties to validate like range, delay, etc.
        // @TODO: temporal hardcoded single action "short-attack".
        let currentAction = playerSchema.actions['attack-short'];
        if(!currentAction.validate(playerSchema, target) || !currentAction.isInRange(playerSchema, target)){
            return false;
        }
        // execute and apply the attack:
        await currentAction.execute(playerSchema, target);
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

    async updateTargetClient(targetClient, targetSchema, attackerId, room)
    {
        room.broadcast({
            act: GameConst.ATTACK,
            atk: attackerId,
            def: targetSchema.sessionId,
            type: this.pvType || 'pvp'
        });
        if(targetSchema.stats.hp === 0){
            // player is dead! reinitialize the stats:
            targetSchema.stats = targetSchema.initialStats;
            // save the stats:
            await room.savePlayerStats(targetSchema);
            await room.saveStateAndRemovePlayer(targetSchema.sessionId);
            room.send(targetClient, {act: GameConst.GAME_OVER});
            return false;
        } else {
            await room.savePlayerStats(targetSchema);
            // update the target:
            room.send(targetClient, {act: GameConst.PLAYER_STATS, stats: targetSchema.stats});
            return true;
        }
    }

}

module.exports.Battle = Battle;
