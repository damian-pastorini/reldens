/**
 *
 * Reldens - RewardMessageActions
 *
 */

const { RewardsConst } = require('../constants');
const { ObjectsConst } = require('../../objects/constants');
const { Logger, sc } = require('@reldens/utils');

class RewardMessageActions
{

    constructor(targetDeterminer)
    {
        this.targetDeterminer = targetDeterminer;
    }

    async executeMessageActions(client, message, room, playerSchema)
    {
        if(!sc.hasOwn(message, 'act') || !sc.hasOwn(message, 'type')){
            return false;
        }
        if(ObjectsConst.OBJECT_INTERACTION !== message.act ||
            RewardsConst.REWARDS_PICK_UP_ACT !== message.type){
            return false;
        }
        let rewardId = sc.get(message, 'id', false);
        if(!rewardId){
            Logger.warning('A reward type message was received but without id');
            return false;
        }
        let rewardObject = sc.get(room.roomWorld.objectsManager.roomObjects, rewardId, false);
        if(!rewardObject){
            Logger.error('Could not found reward ' + rewardId + ' on roomObjects');
            return false;
        }
        if(!rewardObject.isValidInteraction(playerSchema.state.x, playerSchema.state.y)){
            return false;
        }
        let eventData = {
            rewardObject,
            client,
            room,
            playerSchema,
            continueEvent: true
        }
        await room.events.emit('reldens.beforeRemovingDroppedReward', eventData);
        if(!eventData.continueEvent){
            return false;
        }
        let rewardTargets = RewardsConst.SPLIT_ITEMS.DROP_KEEPS === room.config.getWithoutLogs(
            'client/rewards/general/splitItems',
            ''
        ) ? {[playerSchema.player_id]: playerSchema} : this.targetDeterminer.forReward(playerSchema);
        let playersKeys = Object.keys(rewardTargets);
        let randomIndex = sc.randomInteger(0, playersKeys.length);
        let randomTarget = rewardTargets[playersKeys[randomIndex]];
        await this.addItemToInventory(rewardObject.rewardModel, randomTarget);
        RewardMessageActions.removeDrop(room, rewardObject);
        room.broadcast('*', {act: RewardsConst.REMOVE_DROP, id: rewardObject.objectIndex});
        return true;
    }

    static removeDrop(room, rewardObject)
    {
        // @TODO - BETA - Move the next 3 calls into a single method on the room class, like room.removeObject().
        room.roomWorld.removeBody(rewardObject.objectBody);
        room.objectsManager.removeObjectData(rewardObject);
        room.deleteObjectSceneData(rewardObject);
        if(!room.objectsManager.hasRewardsDropped()){
            room.enableOnDispose();
        }
    }

    async addItemToInventory(rewardModel, playerSchema)
    {
        let item = await playerSchema.skillsServer.dataServer.getEntity('item').loadById(rewardModel.itemId);
        let rewardItem = playerSchema.inventory.manager.createItemInstance(item.key);
        return await playerSchema.inventory.manager.addItem(rewardItem);
    }

}

module.exports.RewardMessageActions = RewardMessageActions;
