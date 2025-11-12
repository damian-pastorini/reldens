/**
 *
 * Reldens - PickUpObject
 *
 */

const { RewardsConst } = require('../constants');
const { AddItemToInventory } = require('./add-item-to-inventory');
const { Logger, sc } = require('@reldens/utils');

class PickUpObject
{

    async execute(roomObject, room, playerSchema, targetDeterminer)
    {
        let splitConfig = room.config.getWithoutLogs('client/rewards/general/splitItems', false);
        let rewardTargets = RewardsConst.SPLIT_ITEMS.DROP_KEEPS === splitConfig || !targetDeterminer
            ? {[playerSchema.player_id]: playerSchema}
            : targetDeterminer.forReward(playerSchema);
        let playersKeys = Object.keys(rewardTargets);
        let randomIndex = sc.randomInteger(0, (playersKeys.length -1));
        let randomTarget = rewardTargets[playersKeys[randomIndex]];
        if(!roomObject.itemId){
            Logger.warning('Object with ID "'+roomObject.id+'" has no item ID.');
            return false;
        }
        let itemModel = await room.dataServer.getEntity('itemsItem').loadById(roomObject.itemId);
        if(!itemModel){
            Logger.warning('Object with ID "'+roomObject.id+'" not found.');
            return false;
        }
        await AddItemToInventory.byItemModelOnPlayer(itemModel, randomTarget);
        room.removeObject(roomObject);
        return true;
    }

}

module.exports.PickUpObject = new PickUpObject();
