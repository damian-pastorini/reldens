/**
 *
 * Reldens - PickUpObject
 *
 * Handles picking up item objects from the game world, determining target players based on team/split configuration, and adding items to inventory.
 * The drop is taken before anything is awaited, so overlapping pick ups of the same drop give its item once, and it is
 * removed only when the item was added (a locked or full inventory keeps the drop in the room for another pick up).
 *
 */

const { RewardsConst } = require('../constants');
const { AddItemToInventory } = require('./add-item-to-inventory');
const { Logger, sc } = require('@reldens/utils');

class PickUpObject
{

    /**
     * @param {Object} roomObject
     * @param {Object} room
     * @param {Object} playerSchema
     * @param {Object} targetDeterminer
     * @returns {Promise<boolean>}
     */
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
        if(roomObject.isPickedUp){
            return false;
        }
        roomObject.isPickedUp = true;
        try {
            let itemModel = await room.dataServer.getEntity('itemsItem').loadById(roomObject.itemId);
            if(!itemModel){
                Logger.warning('Object with ID "'+roomObject.id+'" not found.');
            }
            roomObject.isPickedUp = Boolean(itemModel)
                && Boolean(await AddItemToInventory.byItemModelOnPlayer(itemModel, randomTarget));
        } catch (error) {
            Logger.error('The item of the object with ID "'+roomObject.id+'" could not be added.', error.message);
            roomObject.isPickedUp = false;
        }
        if(!roomObject.isPickedUp){
            return false;
        }
        room.removeObject(roomObject);
        return true;
    }

}

module.exports.PickUpObject = new PickUpObject();
