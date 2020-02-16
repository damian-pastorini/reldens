/**
 *
 * Reldens - Pve
 *
 * Player vs environment battle logic handler.
 *
 */

const { Battle } = require('./battle');
const { ErrorManager } = require('../../game/error-manager');
const { Logger } = require('../../game/logger');
const { BattleConst } = require('../constants');

class Pve extends Battle
{

    constructor(props)
    {
        super(props);
        this.chaseMultiple = {}.hasOwnProperty.call(props, 'chaseMultiple') ? props.chaseMultiple : false;
        this.inBattleWithPlayer = [];
    }

    setTargetObject(targetObject)
    {
        this.targetObject = targetObject;
    }

    async runBattle(playerSchema, target, room)
    {
        // @NOTE: run battle method is for when the player attacks any target. PVE can be started in different ways, as
        // how the current enemy-object entity is setup when the player collision with the enemy the enemy will start
        // the battle, but normally the battle would start if the player attack the target (which will be the
        // difference between passive and aggressive enemies).
        let inBattle = await super.runBattle(playerSchema, target);
        if(!inBattle){
            return;
        }
        // console.log('target.stats.hp', target.stats.hp);
        if(target.stats.hp === 0){
            // @NOTE: battleEnded is when the enemy dies.
            this.battleEnded(playerSchema, room);
        } else {
            await this.startBattleWith(playerSchema, room);
        }
    }

    async startBattleWith(playerSchema, room)
    {
        // @TODO: yeah... a lot could happen and this could be improved by cleaning the timers on specific actions like
        //   when player disconnects.
        if(!room || !room.roomWorld || !playerSchema || !room.state || !room.state.players[playerSchema.sessionId]){
            // @NOTE: leaveBattle is used for when the player can't be reached anymore or disconnected.
            this.leaveBattle(playerSchema);
            return false;
        }
        // @NOTE: in PVE we will have this additional method startBattleWith which is when the environment attacks the
        // player.
        if(!this.targetObject){
            ErrorManager.error('Undefined target for PvE.');
            this.leaveBattle(playerSchema);
            return false;
        }
        // the enemy died:
        if(this.targetObject.stats.hp === 0){
            this.leaveBattle(playerSchema);
            return false;
        }
        // if target (npc) is already in battle with another player then ignore the current attack:
        if(
            !this.chaseMultiple
            && this.inBattleWithPlayer.length >= 1
            && this.inBattleWithPlayer.indexOf(playerSchema.player_id) === -1
        ){
            this.leaveBattle(playerSchema);
            return false;
        }
        if(this.inBattleWithPlayer.indexOf(playerSchema.player_id) === -1){
            this.inBattleWithPlayer.push(playerSchema.player_id);
        }
        // @TODO: temporal hardcoded attack-short since it's the only action we have for now.
        if(!this.targetObject.actions['attack-short'].validate(this.targetObject, playerSchema)){
            this.leaveBattle(playerSchema);
            return false;
        }
        if(this.targetObject.actions['attack-short'].isInRange(this.targetObject, playerSchema)){
            // reset the path finder in case the object was moving:
            this.targetObject.objectBody.resetAuto();
            this.targetObject.objectBody.velocity = [0, 0];
            // execute and apply the attack:
            await this.targetObject.actions['attack-short'].execute(this.targetObject, playerSchema);
            let targetClient = room.getClientById(playerSchema.sessionId);
            if(targetClient){
                let updateResult = await this.updateTargetClient(targetClient, playerSchema, this.targetObject.key, room).catch((err) => {
                    ErrorManager.error(err);
                });
                if(updateResult){
                    setTimeout(() => {
                        this.startBattleWith(playerSchema, room);
                    }, this.targetObject.actions['attack-short'].attackDelay);
                } else {
                    this.leaveBattle(playerSchema);
                }
            }
        } else {
            let chaseResult = this.targetObject.chasePlayer(playerSchema);
            if(chaseResult.length){
                setTimeout(() => {
                    this.startBattleWith(playerSchema, room);
                }, this.targetObject.actions['attack-short'].attackDelay);
            } else {
                this.leaveBattle(playerSchema);
            }
        }
    }

    leaveBattle(playerSchema)
    {
        this.removeInBattlePlayer(playerSchema);
        this.targetObject.objectBody.moveToOriginalPoint();
    }

    battleEnded(playerSchema, room)
    {
        this.removeInBattlePlayer(playerSchema);
        // @TODO: respawn the monster.
        let client = room.getClientById(playerSchema.sessionId);
        if(client){
            room.send(client, {act: BattleConst.BATTLE_ENDED});
        } else {
            Logger.log(['Client not found by sessionId:', playerSchema.sessionId]);
        }
    }
    
    removeInBattlePlayer(playerSchema)
    {
        let playerIndex = this.inBattleWithPlayer.indexOf(playerSchema.player_id);
        if(playerIndex !== -1){
            this.inBattleWithPlayer.splice(playerIndex, 1);
        }
    }

}

module.exports.Pve = Pve;
