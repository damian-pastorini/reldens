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
        this.battleType = false;
    }

    // @TODO: fix / improve battleType implementation.
    async runBattle(playerSchema, target, battleType, room)
    {
        // @NOTE: each attack will have different properties to validate like range, delay, etc.
        let runAction = 'attack-short'; // default action
        if(playerSchema.currentAction && {}.hasOwnProperty.call(playerSchema.actions, playerSchema.currentAction)){
            runAction = playerSchema.currentAction;
        }
        let currentAction = playerSchema.actions[runAction];
        currentAction.room = room;
        currentAction.currentBattle = this;
        let inRange = currentAction.isInRange(playerSchema, target);
        if(!inRange){
            return false;
        }
        let validAttack = currentAction.validate(playerSchema, target);
        if(!validAttack){
            return false;
        }
        if(!currentAction.attacker){
            currentAction.attacker = playerSchema;
        }
        if(!currentAction.defender){
            currentAction.defender = target;
        }
        // execute and apply the attack:
        playerSchema.broadcastKey = playerSchema.sessionId;
        if(target.isRoomObject){
            target.broadcastKey = target.key;
        } else if({}.hasOwnProperty.call(target, 'sessionId')){
            target.broadcastKey = target.sessionId;
        }
        let executeResult = await currentAction.execute(playerSchema, target, battleType, room);
        // include the target in the battle list:
        this.lastAttack = Date.now();
        this.inBattleWith[target.id] = {target: target, time: this.lastAttack, battleTimer: false};
        let useTimerObj = this; // BattleConst.BATTLE_TYPE_GENERAL
        if(this.timerType === BattleConst.BATTLE_TYPE_PER_TARGET){
            useTimerObj = this.inBattleWith[target.id];
        }
        this.setTimerOn(useTimerObj, target);
        playerSchema.currentAction = false; // reset action.
        return executeResult;
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
        if(targetSchema.stats.hp === 0){
            // player is dead! reinitialize the stats:
            targetSchema.stats = targetSchema.initialStats;
            // save the stats:
            await room.savePlayerStats(targetSchema);
            let actionData = {
                act: BattleConst.BATTLE_ENDED,
                x: targetSchema.state.x,
                y: targetSchema.state.y,
                t: targetSchema.sessionId
            };
            room.broadcast(actionData);
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
