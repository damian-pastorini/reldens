/**
 *
 * Reldens - Pve
 *
 * Player vs environment battle logic handler.
 *
 */

const { Battle } = require('./battle');
const { ErrorManager } = require('../../game/error-manager');

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
        await this.startBattleWith(playerSchema, room);
    }

    async startBattleWith(playerSchema, room)
    {
        // @NOTE: in PVE we will have this additional method startBattleWith which is when the environment attacks the
        // player.
        if(!this.targetObject){
            ErrorManager.error('Undefined target for PvE.');
            return false;
        }
        // if target (npc) is already in battle with another player then ignore the current attack:
        if(
            !this.chaseMultiple
            && this.inBattleWithPlayer.length >= 1
            && this.inBattleWithPlayer.indexOf(playerSchema.player_id) === -1
        ){
            return false;
        }
        if(this.inBattleWithPlayer.indexOf(playerSchema.player_id) === -1){
            this.inBattleWithPlayer.push(playerSchema.player_id);
        }
        // @TODO: temporal hardcoded attack-short since it's the only action we have for now.
        if(!this.targetObject.actions['attack-short'].validate(this.targetObject, playerSchema)){
            return false;
        }
        if(this.targetObject.actions['attack-short'].isInRange(this.targetObject, playerSchema)){
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
                }
            }
        } else {
            this.targetObject.chasePlayer(playerSchema);
            setTimeout(() => {
                this.startBattleWith(playerSchema, room);
            }, this.targetObject.actions['attack-short'].attackDelay);
        }
    }

}

module.exports.Pve = Pve;
