/**
 *
 * Reldens - Battle
 *
 */

const { BattleEndAction } = require('./battle-end-action');
const { PlayerDeathEvent } = require('./events/player-death-event');
const { ActionsConst } = require('../constants');
const { GameConst } = require('../../game/constants');
const { Logger, sc } = require('@reldens/utils');

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
        this.timerType = props.timerType || ActionsConst.BATTLE_TYPE_PER_TARGET;
        this.lastAttack = false;
        this.lastAttackKey = false;
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in Battle.');
        }
    }

    async runBattle(playerSchema, target)
    {
        if(GameConst.STATUS.ACTIVE !== playerSchema.inState){
            Logger.error('Battle inactive player with ID "'+playerSchema.player_id+'".', playerSchema.inState);
            delete this.inBattleWith[target.id];
            return false;
        }
        if(target.inState && GameConst.STATUS.ACTIVE.toString() !== target.inState.toString()){
            Logger.error(
                'Inactive target ID "'+(target.uid || target.player_id)
                +'" in state "'+target.inState+'"/"'+GameConst.STATUS.ACTIVE+'".'
            );
            delete this.inBattleWith[target.id];
            return false;
        }
        // @NOTE: each attack will have different properties to validate like range, delay, etc.
        let currentAction = this.getCurrentAction(playerSchema);
        if(!currentAction){
            Logger.error('Actions not defined for this player with ID "'+playerSchema.player_id+'".');
            delete this.inBattleWith[target.id];
            return false;
        }
        currentAction.currentBattle = this;
        this.lastAttackKey = currentAction.key;
        let executeResult = await currentAction.execute(target);
        // include the target in the battle list:
        this.lastAttack = Date.now();
        this.inBattleWith[target.id] = {target: target, time: this.lastAttack, battleTimer: false};
        let useTimerObj = this;
        if(this.timerType === ActionsConst.BATTLE_TYPE_PER_TARGET){
            useTimerObj = this.inBattleWith[target.id];
        }
        this.setTimerOn(useTimerObj, target);
        playerSchema.currentAction = false; // reset action.
        return executeResult;
    }

    getCurrentAction(playerSchema)
    {
        let currentAction = playerSchema.currentAction;
        return sc.get(
            playerSchema.actions,
            currentAction,
            playerSchema.skillsServer.classPath.currentSkills[currentAction]
        );
    }

    setTimerOn(useTimerObj, target)
    {
        if(useTimerObj.battleTimer){
            clearTimeout(useTimerObj.battleTimer);
            delete this.inBattleWith[target.id];
        }
        if(this.battleTimeOff){
            useTimerObj.battleTimer = setTimeout(() => {
                delete this.inBattleWith[target.id];
            }, this.battleTimeOff);
        }
    }

    async updateTargetClient(targetClient, targetSchema, attackerId, room, attackerPlayer)
    {
        let affectedProperty = room.config.get('client/actions/skills/affectedProperty');
        if(0 === targetSchema.stats[affectedProperty]){
            return await this.clientDeathUpdate(targetSchema, room, targetClient, affectedProperty, attackerPlayer);
        }
        return await room.savePlayerStats(targetSchema, targetClient);
    }

    async clientDeathUpdate(targetSchema, room, targetClient, affectedProperty, attackerPlayer)
    {
        if(!targetSchema.player_id){
            Logger.error('Target is not a player.', targetSchema.player_id);
            return false;
        }
        targetSchema.inState = GameConst.STATUS.DEATH;
        let actionData = new BattleEndAction(
            targetSchema.state.x,
            targetSchema.state.y,
            targetSchema.sessionId,
            this.lastAttackKey
        );
        let body = targetSchema.physicalBody;
        room.roomWorld.removeBodies.push(body);
        room.broadcast('*', actionData);
        await room.savePlayerState(targetSchema.sessionId);
        targetClient.send('*', {act: GameConst.GAME_OVER});
        await room.savePlayerStats(targetSchema, targetClient);
        targetSchema.setPrivate(
            'playerDeathTimer',
            setTimeout(
                async () => {
                    if(!room.roomWorld){
                        Logger.critical('Room world not available to set player death timer.');
                        return false;
                    }
                    try {
                        room.roomWorld.addBody(body);
                        targetSchema.inState = GameConst.STATUS.ACTIVE;
                        // player is dead! reinitialize the stats using its base value:
                        targetSchema.stats[affectedProperty] = targetSchema.statsBase[affectedProperty];
                        await room.savePlayerStats(targetSchema, targetClient);
                        room.broadcast('*', {act: GameConst.REVIVED, t: targetSchema.sessionId});
                    } catch (error) {
                        Logger.critical('There was an error on setting player death timer. '+error.message)
                    }
                },
                (room.config.get('server/players/gameOver/timeOut') || 1)
            )
        );
        room.events.emit('reldens.playerDeath', new PlayerDeathEvent({
            targetSchema,
            room,
            targetClient,
            affectedProperty,
            attackerPlayer
        }));
        return false;
    }
}

module.exports.Battle = Battle;
