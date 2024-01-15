/**
 *
 * Reldens - Pve
 *
 */

const { Battle } = require('./battle');
const { BattleEndAction } = require('./battle-end-action');
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
        if(GameConst.STATUS.ACTIVE !== playerSchema.inState){
            Logger.info('PvE inactive player.', playerSchema.inState);
            return false;
        }
        // @TODO - BETA - Make PvP available by configuration.
        // @NOTE: run battle method is for when the player attacks any target. PVE can be started in different ways,
        // depending on how the current enemy-object was implemented, for example the PVE can start when the player just
        // collides with the enemy (instead of attack it) an aggressive enemy could start the battle automatically.
        let attackResult = await super.runBattle(playerSchema, target, roomScene);
        await this.events.emit('reldens.runBattlePveAfter', {playerSchema, target, roomScene, attackResult});
        if(!attackResult){
            // @NOTE: the attack result can be false because different reasons, for example it could be a physical
            // attack for which matter we won't start the battle until the physical body hits the target.
            return false;
        }
        // @TODO - BETA - Target affected property could be passed on the target object.
        if(0 < target.stats[roomScene.config.get('client/actions/skills/affectedProperty')]){
            return await this.startBattleWith(playerSchema, roomScene);
        }
        // physical attacks or effects will run the battleEnded, normal attacks or effects will hit this case:
        return await this.battleEnded(playerSchema, roomScene);
    }

    async startBattleWith(playerSchema, room)
    {
        if(!this.targetObject){
            Logger.critical('Target Object reference removed.');
            return false;
        }
        let thisWorldKey = this.targetObject?.objectBody?.world?.worldKey;
        let targetWorldKey = playerSchema?.physicalBody?.world?.worldKey;
        if(!thisWorldKey || !targetWorldKey || thisWorldKey !== targetWorldKey){
            Logger.debug('World keys check failed.', {thisWorldKey, targetWorldKey});
            return false;
        }
        if(
            !room?.roomWorld
            || !room?.state
            || !playerSchema
            || !room.playerBySessionIdFromState(playerSchema.sessionId)
        ){
            Logger.debug('Room or player missing references.');
            // @NOTE: leaveBattle is used for when the player can't be reached anymore or disconnected.
            this.leaveBattle(playerSchema);
            return false;
        }
        // @NOTE: in PVE we will have this additional method startBattleWith which is when the environment attacks the
        // player.
        if(!this.targetObject){
            Logger.error('Undefined target object for PvE.');
            this.leaveBattle(playerSchema);
            return false;
        }
        if(0 === (this.targetObject.actionsKeys?.length ?? 0)){
            Logger.error('Target Object does not have any actions assigned.');
            this.leaveBattle(playerSchema);
            return false;
        }
        // the enemy died:
        if(0 >= this.targetObject.stats[room.config.get('client/actions/skills/affectedProperty')]){
            // battle ended checkpoint:
            return false;
        }
        // if target (npc) is already in battle with another player then ignore the current attack:
        if(
            !this.chaseMultiple
            && 1 <= this.inBattleWithPlayer.length
            && -1 === this.inBattleWithPlayer.indexOf(playerSchema.player_id)
        ){
            this.leaveBattle(playerSchema);
            return false;
        }
        if(-1 === this.inBattleWithPlayer.indexOf(playerSchema.player_id)){
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
        if(inRange){
            return await this.attackInRange(objectAction, playerSchema, room);
        }
        return this.chasePlayer(playerSchema, room, objectAction);
    }

    chasePlayer(playerSchema, room, objectAction)
    {
        // @TODO - BETA - Fix chase behavior when a bullet attack is available on enemies.
        let chaseResult = this.targetObject.chaseBody(playerSchema.physicalBody);
        if(0 < chaseResult.length){
            return this.startBattleWithDelay(playerSchema, room, objectAction);
        }
        return this.leaveBattle(playerSchema);
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
                return false;
            });
        if(update){
            return await this.startBattleWithDelay(playerSchema, room, objectAction);
        }
        return this.leaveBattle(playerSchema);
    }

    async startBattleWithDelay(playerSchema, room, objectAction)
    {
        if(0 < objectAction.skillDelay){
            setTimeout(async () => {
                await this.startBattleWith(playerSchema, room);
            }, objectAction.skillDelay);
            return;
        }
        await this.startBattleWith(playerSchema, room);
    }

    leaveBattle(playerSchema)
    {
        this.removeInBattlePlayer(playerSchema);
        if(!this.targetObject){
            Logger.critical('Target Object reference not found.');
            return false;
        }
        this.targetObject.objectBody.moveToOriginalPoint();
    }

    async battleEnded(playerSchema, room)
    {
        // @TODO - BETA - Implement battle end in both PvE and PvP.
        this.targetObject.objectBody.bodyState.inState = GameConst.STATUS.DEATH;
        Logger.debug('Battle ended, set target with ID "'+this.targetObject.uid+'" state to "DEATH".');
        this.removeInBattlePlayer(playerSchema);
        let actionData = new BattleEndAction(
            this.targetObject.objectBody.position[0],
            this.targetObject.objectBody.position[1],
            this.targetObject.key,
            this.lastAttackKey
        );
        room.broadcast('*', actionData);
        if(sc.isObjectFunction(this.targetObject, 'respawn')){
            await this.targetObject.respawn(room);
        }
        this.sendBattleEndedActionData(room, playerSchema, actionData);
        await this.events.emit(this.targetObject.getBattleEndEvent(), playerSchema, this, actionData);
        await this.events.emit('reldens.battleEnded', {playerSchema, pve: this, actionData, room});
    }

    sendBattleEndedActionData(room, playerSchema, actionData)
    {
        let client = room.getClientById(playerSchema.sessionId);
        if(!client){
            Logger.info('Client not found by sessionId: '+ playerSchema.sessionId);
            return;
        }
        client.send('*', actionData);
    }

    removeInBattlePlayer(playerSchema)
    {
        let playerIndex = this.inBattleWithPlayer.indexOf(playerSchema.player_id);
        if(-1 !== playerIndex){
            this.inBattleWithPlayer.splice(playerIndex, 1);
        }
    }

}

module.exports.Pve = Pve;
