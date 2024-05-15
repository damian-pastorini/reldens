/**
 *
 * Reldens - RewardMessageActions
 *
 */

const { ObjectsConst } = require('../../objects/constants');
const { RewardsConst } = require('../constants');
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
        if(ObjectsConst.OBJECT_INTERACTION !== message.act || ObjectsConst.DROPS.PICK_UP_ACT !== message.type){
            return false;
        }
        let objectId = sc.get(message, 'id', false);
        if(!objectId){
            Logger.warning('A drop type message was received but without id');
            return false;
        }
        let roomObject = sc.get(room.roomWorld.objectsManager.roomObjects, objectId, false);
        if(!roomObject){
            Logger.error('Could not found object with ID "'+objectId+'" on roomObjects.');
            return false;
        }
        if(!roomObject.isValidInteraction(playerSchema.state.x, playerSchema.state.y)){
            return false;
        }
        let eventData = {roomObject, client, room, playerSchema, continueEvent: true};
        await room.events.emit('reldens.beforeRemovingDroppedReward', eventData);
        if(!eventData.continueEvent){
            return false;
        }
        let splitConfig = room.config.getWithoutLogs('client/rewards/general/splitItems', false);
        let rewardTargets = RewardsConst.SPLIT_ITEMS.DROP_KEEPS === splitConfig
            ? {[playerSchema.player_id]: playerSchema}
            : this.targetDeterminer.forReward(playerSchema);
        let playersKeys = Object.keys(rewardTargets);
        let randomIndex = sc.randomInteger(0, (playersKeys.length -1));
        let randomTarget = rewardTargets[playersKeys[randomIndex]];
        if(!roomObject.itemId){
            Logger.warning('Object with ID "'+objectId+'" has no item ID.');
            return false;
        }
        await this.addItemToInventory(roomObject.itemId, randomTarget);
        room.removeObject(roomObject);
        return true;
    }

    async addItemToInventory(itemId, playerSchema)
    {
        let itemModel = await playerSchema.skillsServer.dataServer.getEntity('item').loadById(itemId);
        let itemInstance = playerSchema.inventory.manager.createItemInstance(itemModel.key);
        return await playerSchema.inventory.manager.addItem(itemInstance);
    }

}

module.exports.RewardMessageActions = RewardMessageActions;
