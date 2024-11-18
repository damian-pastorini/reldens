/**
 *
 * Reldens - Pve
 *
 */

const { Battle } = require('./battle');
const { BattleEndAction } = require('./battle-end-action');
const { BattleEndedEvent } = require('./events/battle-ended-event');
const { GameConst } = require('../../game/constants');
const { Logger, sc } = require('@reldens/utils');

class Pve extends Battle
{

    constructor(props)
    {
        super(props);
        this.chaseMultiple = sc.get(props, 'chaseMultiple', false);
        this.inBattleWithPlayers = {};
        this.isBattleEndProcessing = false;
        this.uid = sc.randomChars(8)+'-'+(new Date()).getTime();
    }

    setTargetObject(targetObject)
    {
        this.targetObject = targetObject;
    }

    async runBattle(playerSchema, target, roomScene)
    {
        Logger.debug('Running Battle between player "'+playerSchema.sessionId+'" and target "'+target.id+'".', this.uid);
        if(GameConst.STATUS.ACTIVE !== playerSchema.state.inState){
            Logger.info('PvE inactive player.', playerSchema.state.inState);
            delete this.inBattleWith[target.id];
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
        let affectedProperty = roomScene.config.get('client/actions/skills/affectedProperty');
        if(!affectedProperty){
            Logger.error('Affected property configuration is missing');
            return false;
        }
        if(!sc.hasOwn(target.stats, affectedProperty)){
            Logger.error('Affected property is not present on target stats.', Object.keys(target.stats));
            return false;
        }
        let affectedPropertyTargetValue = Number(sc.get(target.stats, affectedProperty, 0));
        if(0 < affectedPropertyTargetValue){
            return await this.startBattleWith(playerSchema, roomScene);
        }
        // physical attacks or effects will run the battleEnded, normal attacks or effects will hit this case:
        return await this.battleEnded(playerSchema, roomScene);
    }

    async startBattleWith(playerSchema, room)
    {
        if(!this.targetObject){
            // @NOTE: this will be the expected case when the player was killed in between different NPCs attacks.
            // Logger.debug('Target Object reference removed.');
            return false;
        }
        let targetObjectWorld = this.targetObject.objectBody?.world;
        let objectWorldKey = targetObjectWorld?.worldKey;
        let playerWorld = playerSchema?.physicalBody?.world;
        let playerWorldKey = playerWorld?.worldKey;
        if(!objectWorldKey || !playerWorldKey || objectWorldKey !== playerWorldKey){
            if(playerWorldKey){
                Logger.debug('World keys check failed.', {
                    targetObject: this.targetObject.uid,
                    objectRoomId: targetObjectWorld.roomId,
                    objectSceneName: targetObjectWorld.sceneName,
                    objectWorldKey,
                    playerId: playerSchema.player_id,
                    playerRoomId: playerWorld.roomId,
                    playerSceneName: playerWorld.sceneName,
                    playerWorldKey,
                });
            }
            // playerWorldKey will be null while the player is dead because the removeBody
            // Logger.debug('Leaving battle, world keys check failed.', playerSchema.player_id);
            this.leaveBattle(playerSchema);
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
        if(!playerSchema.stats){
            Logger.debug('Player not ready yet to be attacked.');
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
            Logger.warning('Target Object does not have any actions assigned.');
            this.leaveBattle(playerSchema);
            return false;
        }
        if(0 >= this.targetObject.stats[room.config.get('client/actions/skills/affectedProperty')]){
            // Logger.debug('Target object affected property is zero.');
            return false;
        }
        // if target (npc) is already in battle with another player then ignore the current attack:
        let inBattleWithPlayersIds = Object.keys(this.inBattleWithPlayers);
        let inBattleWithCurrentPlayer = this.inBattleWithPlayers[playerSchema.player_id];
        if(!this.chaseMultiple && 1 <= inBattleWithPlayersIds.length && !inBattleWithCurrentPlayer){
            Logger.debug('Object already in battle with player "'+playerSchema.player_id+'".');
            return false;
        }
        this.inBattleWithPlayers[playerSchema.player_id] = true;
        let objectAction = this.pickRandomActionFromObject();
        objectAction.room = room;
        objectAction.currentBattle = this;
        if(!objectAction.validate()){
            // @NOTE: none logs here because it will create a (useless) log entry everytime an NPC tries to attack.
            // expected when for example the action is out of range or has a skill delay, then we restart the battle:
            return this.chasePlayer(playerSchema, room, objectAction);
        }
        let ownerPos = {x: this.targetObject.state.x, y: this.targetObject.state.y};
        let targetPos = {x: playerSchema.state.x, y: playerSchema.state.y};
        let inRange = objectAction.isInRange(ownerPos, targetPos);
        if(inRange){
            this.isBattleEndProcessing = false;
            return await this.attackInRange(objectAction, playerSchema, room);
        }
        return this.chasePlayer(playerSchema, room, objectAction);
    }

    pickRandomActionFromObject()
    {
        let objActionIdx = Math.floor(Math.random() * this.targetObject.actionsKeys.length);
        let objectActionKey = this.targetObject.actionsKeys[objActionIdx];
        return this.targetObject.actions[objectActionKey];
    }

    chasePlayer(playerSchema, room, objectAction)
    {
        let chaseResult = this.targetObject.chaseBody(playerSchema.physicalBody);
        if(chaseResult && 0 < chaseResult.length){
            return this.startBattleWithDelay(playerSchema, room, objectAction);
        }
        Logger.debug('Leave battle, chase result failed.');
        return this.leaveBattle(playerSchema);
    }

    async attackInRange(objectAction, playerSchema, room)
    {
        if(this.targetObject.objectBody){
            // reset the pathfinder in case the object was moving:
            this.targetObject.objectBody.resetAuto();
            this.targetObject.objectBody.velocity = [0, 0];
        }
        // execute and apply the attack:
        await objectAction.execute(playerSchema);
        Logger.debug('Executed action "'+objectAction.key+'" on player "'+playerSchema.player_id+'".');
        let targetClient = room.getClientById(playerSchema.sessionId);
        if(!targetClient){
            Logger.debug('Leave battle, missing target client.');
            return this.leaveBattle(playerSchema);
        }
        let targetObjectId = this.targetObject?.id;
        if(!targetObjectId){
            Logger.debug('Leave battle, missing target object ID.');
            return this.leaveBattle(playerSchema);
        }
        let update = await this.updateTargetClient(targetClient, playerSchema, targetObjectId, room)
            .catch((error) => {
                Logger.error('Leave battle, update target client catch error.', error);
                return this.leaveBattle(playerSchema);
            });
        if(update){
            return await this.startBattleWithDelay(playerSchema, room, objectAction);
        }
        Logger.debug('Leave battle, target client update failed.');
        return this.leaveBattle(playerSchema);
    }

    async startBattleWithDelay(playerSchema, room, objectAction)
    {
        if(0 < objectAction.skillDelay){
            setTimeout(async () => {
                if(!this.targetObject){
                    return false;
                }
                await this.startBattleWith(playerSchema, room);
            }, objectAction.skillDelay);
            return;
        }
        await this.startBattleWith(playerSchema, room);
    }

    leaveBattle(playerSchema)
    {
        Logger.debug('Leaving battle.', {player: playerSchema?.player_id, object: this.targetObject?.uid});
        if(playerSchema?.player_id){
            this.removeInBattlePlayer(playerSchema);
        }
        return this.moveObjectToOriginPoints();
    }

    moveObjectToOriginPoints()
    {
        if(!this.targetObject){
            // expected on client disconnection:
            // Logger.debug('Target Object reference not found.');
            return false;
        }
        if(GameConst.STATUS.ACTIVE !== this.targetObject.objectBody.bodyState.inState){
            return false;
        }
        Logger.debug('Move back to origin.', {
            uid: this.uid,
            object: this.targetObject.uid,
            state: this.targetObject.objectBody.bodyState.inState,
            column: this.targetObject.objectBody.originalCol,
            row: this.targetObject.objectBody.originalRow
        });
        this.targetObject.objectBody.moveToOriginalPoint();
        return true;
    }

    async battleEnded(playerSchema, room)
    {
        if(this.isBattleEndProcessing){
            Logger.debug('Battle end in progress.', this.uid);
            return false;
        }
        this.isBattleEndProcessing = true;
        // @TODO - BETA - Implement battle end in both PvE and PvP.
        this.targetObject.objectBody.bodyState.inState = GameConst.STATUS.DEATH;
        Logger.debug(
            'Battle end, player ID "'+playerSchema?.player_id+'", target ID "'+this.targetObject.uid+'".',
            this.uid
        );
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
        let event = new BattleEndedEvent({playerSchema, pve: this, actionData, room});
        await this.events.emit(this.targetObject.getBattleEndEvent(), event);
        await this.events.emit('reldens.battleEnded', event);
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
        if(!playerSchema?.player_id){
            return false;
        }
        if(this.inBattleWithPlayers[playerSchema.player_id]){
            delete this.inBattleWithPlayers[playerSchema.player_id];
        }
        return true;
    }

}

module.exports.Pve = Pve;
