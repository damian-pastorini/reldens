const { RewardsConst } = require('../constants');
const { sc, Logger } = require('@reldens/utils');
const { ObjectsConst } = require('../../objects/constants');

class RewardMessageActions
{

    async executeMessageActions(client, message, room, playerSchema)
    {
        if (!sc.hasOwn(message, 'act') || !sc.hasOwn(message, 'type')) {
            return false;
        }
        if (ObjectsConst.OBJECT_INTERACTION !== message.act ||
            RewardsConst.REWARDS_PICK_UP_ACT !== message.type) {
            return false;
        }
        let rewardId = sc.get(message, 'id', false);
        if (!rewardId) {
            Logger.warning('A reward type message was received but without id');
            return false;
        }
        let rewardObject = sc.get(room.roomWorld.objectsManager.roomObjects, rewardId, false);
        if (!rewardObject) {
            Logger.error('Could not found reward ' + rewardId + ' on roomObjects');
            return false;
        }
        if (!rewardObject.isValidInteraction(playerSchema.state.x, playerSchema.state.y)) {
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
        if (!eventData.continueEvent) {
            return false;
        }

        await this.addItemToInventory(rewardObject.rewardModel, playerSchema);
        this.removeDrop(room, rewardObject);
        this.broadcastRemoveDrop(room, rewardObject);
        return true;
    }

    removeDrop(room, rewardObject)
    {
        room.roomWorld.removeBody(rewardObject.objectBody);
        room.objectsManager.removeObjectData(rewardObject);
        room.deleteObjectSceneData(rewardObject);
        if (!room.objectsManager.hasRewardsDropped()) {
            room.enableOnDispose();
        }
    }

    broadcastRemoveDrop(room, rewardObject) {
        room.broadcast('*', {
            act: RewardsConst.REMOVE_DROP,
            id: rewardObject.objectIndex
        });
    }

    async addItemToInventory(rewardModel, playerSchema)
    {
        let item = await playerSchema.skillsServer.dataServer.getEntity('item').loadById(rewardModel.itemId);
        let rewardItem = playerSchema.inventory.manager.createItemInstance(item.key);
        return await playerSchema.inventory.manager.addItem(rewardItem);
    }

}

module.exports.RewardMessageActions = RewardMessageActions;