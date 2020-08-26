/**
 *
 * Reldens - Pve
 *
 * Player vs environment battle logic handler.
 *
 */

const { Battle } = require('./battle');
const { Logger, EventsManager } = require('@reldens/utils');
const { ActionsConst } = require('../constants');

class Pve extends Battle
{

    constructor(props)
    {
        super(props);
        this.chaseMultiple = {}.hasOwnProperty.call(props, 'chaseMultiple') ? props.chaseMultiple : false;
        this.inBattleWithPlayer = [];
        this.battleType = 'pve';
    }

    setTargetObject(targetObject)
    {
        this.targetObject = targetObject;
    }

    // @TODO: make pvp available by configuration.
    async runBattle(playerSchema, target, battleType, room)
    {
        // setup broadcast keys:
        this.targetObject.broadcastKey = this.targetObject.key;
        playerSchema.broadcastKey = playerSchema.sessionId;
        // @NOTE: run battle method is for when the player attacks any target. PVE can be started in different ways,
        // depending how the current enemy-object was implemented, for example the PVE can start when the player just
        // collides with the enemy (instead of attack it) an aggressive enemy could start the battle automatically.
        let inBattle = await super.runBattle(playerSchema, target, battleType, room);
        if(playerSchema.currentAction === 'attack-bullet'){
            // the battle will start when the bullet hit the target:
            return false;
        }
        if(inBattle === 'pve'){
            if(target.stats.hp > 0){
                await this.startBattleWith(playerSchema, room);
            } else {
                await this.battleEnded(playerSchema, room);
            }
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
            Logger.error('Undefined target for PvE.');
            this.leaveBattle(playerSchema);
            return false;
        }
        // setup broadcast keys:
        this.targetObject.broadcastKey = this.targetObject.key;
        playerSchema.broadcastKey = playerSchema.sessionId;
        // the enemy died:
        if(this.targetObject.stats.hp === 0){
            await this.battleEnded(playerSchema, room);
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
        let objActionIdx = Math.floor(Math.random() * this.targetObject.actionsKeys.length);
        let objectActionKey = this.targetObject.actionsKeys[objActionIdx];
        let objectAction = this.targetObject.actions[objectActionKey];
        objectAction.room = room;
        objectAction.currentBattle = this;
        if(!objectAction.validate(this.targetObject, playerSchema)){
            this.leaveBattle(playerSchema);
            return false;
        }
        if(objectAction.isInRange(this.targetObject, playerSchema)){
            // reset the path finder in case the object was moving:
            this.targetObject.objectBody.resetAuto();
            this.targetObject.objectBody.velocity = [0, 0];
            // execute and apply the attack:
            let runBattle = await objectAction.execute(this.targetObject, playerSchema, 'pve', room);
            if(runBattle !== 'pve'){
                return;
            }
            let targetClient = room.getClientById(playerSchema.sessionId);
            if(targetClient){
                let update = await this.updateTargetClient(targetClient, playerSchema, this.targetObject.key, room)
                    .catch((err) => {
                    Logger.error(err);
                });
                if(update){
                    setTimeout(() => {
                        this.startBattleWith(playerSchema, room);
                    }, objectAction.skillDelay);
                } else {
                    this.leaveBattle(playerSchema);
                }
            }
        } else {
            // @TODO: fix chase behavior when a bullet attack is available.
            let chaseResult = this.targetObject.chaseBody(playerSchema.physicalBody);
            if(chaseResult.length){
                setTimeout(() => {
                    this.startBattleWith(playerSchema, room);
                }, objectAction.skillDelay);
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
        // @TODO: implement battle end in both pve and pvp.
        this.removeInBattlePlayer(playerSchema);
        let actionData = {
            act: ActionsConst.BATTLE_ENDED,
            x: this.targetObject.objectBody.position[0],
            y: this.targetObject.objectBody.position[1],
            t: this.targetObject.key
        };
        room.broadcast(actionData);
        this.targetObject.respawn();
        let client = room.getClientById(playerSchema.sessionId);
        if(client){
            room.send(client, actionData);
        } else {
            Logger.log(['Client not found by sessionId:', playerSchema.sessionId]);
        }
        EventsManager.emit('reldens.battleEnded', playerSchema, this, actionData);
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
