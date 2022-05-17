/**
 *
 * Reldens - Pve
 *
 * Player vs environment battle logic handler.
 *
 */

const { Battle } = require('./battle');
const { ActionsConst } = require('../constants');
const { GameConst } = require('../../game/constants');
const { Logger, sc } = require('@reldens/utils');

class Pve extends Battle
{

    constructor(props)
    {
        super(props);
        this.chaseMultiple = sc.get(props, 'chaseMultiple', false);
        this.inBattleWithPlayer = [];
    }

    setTargetObject(targetObject)
    {
        this.targetObject = targetObject;
    }

    async runBattle(playerSchema, target, roomScene)
    {
        // @TODO - BETA - Make PvP available by configuration.
        // @NOTE: run battle method is for when the player attacks any target. PVE can be started in different ways,
        // depending how the current enemy-object was implemented, for example the PVE can start when the player just
        // collides with the enemy (instead of attack it) an aggressive enemy could start the battle automatically.
        let attackResult = await super.runBattle(playerSchema, target, roomScene);
        await this.events.emit('reldens.runBattlePveAfter', {playerSchema, target, roomScene, attackResult});
        if(!attackResult){
            // @NOTE: the attack result can be false because different reasons, for example it could be a physical
            // attack for which matter we won't start the battle until the physical body hits the target.
            return false;
        }
        0 < target.stats[roomScene.config.get('client/actions/skills/affectedProperty')]
            ? await this.startBattleWith(playerSchema, roomScene)
            // physical attacks or effects will run the battleEnded, normal attacks or effects will hit this case:
            : await this.battleEnded(playerSchema, roomScene);
    }

    async startBattleWith(playerSchema, room)
    {
        // @TODO - BETA - Yeah... a lot could happen and this could be improved by cleaning the timers on specific
        //   actions like when player disconnects.
        if(!room || !room.roomWorld || !playerSchema || !room.state || !room.playerByIdFromState(playerSchema.sessionId)){
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
        // the enemy died:
        if(0 > this.targetObject.stats[room.config.get('client/actions/skills/affectedProperty')]){
            // battle ended checkpoint:
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
        if(!objectAction.validate()){
            this.leaveBattle(playerSchema);
            return false;
        }
        let ownerPos = {x: this.targetObject.state.x, y: this.targetObject.state.y};
        let targetPos = {x: playerSchema.state.x, y: playerSchema.state.y};
        let inRange = objectAction.isInRange(ownerPos, targetPos);
        inRange ? await this.attackInRange(objectAction, playerSchema, room)
            : this.chasePlayer(playerSchema, room, objectAction);
    }

    chasePlayer(playerSchema, room, objectAction)
    {
        // @TODO - BETA - Fix chase behavior when a bullet attack is available on enemies.
        let chaseResult = this.targetObject.chaseBody(playerSchema.physicalBody);
        chaseResult.length
            ? this.startBattleWithDelay(playerSchema, room, objectAction)
            : this.leaveBattle(playerSchema);
    }

    async attackInRange(objectAction, playerSchema, room)
    {
        // reset the pathfinder in case the object was moving:
        this.targetObject.objectBody.resetAuto();
        this.targetObject.objectBody.velocity = [0, 0];
        // execute and apply the attack:
        await objectAction.execute(playerSchema);
        let targetClient = room.getClientById(playerSchema.sessionId);
        if(!targetClient){
            return false;
        }
        let update = await this.updateTargetClient(targetClient, playerSchema, this.targetObject.key, room)
            .catch((err) => {
                Logger.error(err);
            });
        update ? this.startBattleWithDelay(playerSchema, room, objectAction) : this.leaveBattle(playerSchema);
    }

    startBattleWithDelay(playerSchema, room, objectAction)
    {
        setTimeout(async () => {
            await this.startBattleWith(playerSchema, room);
        }, objectAction.skillDelay);
    }

    leaveBattle(playerSchema)
    {
        this.removeInBattlePlayer(playerSchema);
        this.targetObject.objectBody.moveToOriginalPoint();
    }

    async battleEnded(playerSchema, room)
    {
        // @TODO - BETA - Implement battle end in both PvE and PvP.
        this.targetObject.inState = GameConst.STATUS.DEATH;
        this.removeInBattlePlayer(playerSchema);
        let actionData = {
            act: ActionsConst.BATTLE_ENDED,
            x: this.targetObject.objectBody.position[0],
            y: this.targetObject.objectBody.position[1],
            t: this.targetObject.key,
            k: this.lastAttackKey
        };
        room.broadcast('game-message', actionData);
        await this.targetObject.respawn(room);
        let client = room.getClientById(playerSchema.sessionId);
        if(client){
            client.send('game-message', actionData);
        } else {
            Logger.info(['Client not found by sessionId:', playerSchema.sessionId]);
        }
        await this.events.emit(this.targetObject.getBattleEndEvent(), playerSchema, this, actionData);
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
