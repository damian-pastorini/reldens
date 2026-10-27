/**
 *
 * Reldens - Theme - PlayerSkinApplier
 *
 * Changes the player avatar while an item with a "skinKey" custom data is equipped: equipping it sets the skin as the
 * player avatar key (synchronized to every client through the player schema) and unequipping it restores the class
 * path avatar, or the skin of another equipped skin item. The equipped skin is applied again when the player joins.
 *
 */

const { GameConst, ItemsEvents } = require('reldens/lib/game/constants');

class PlayerSkinApplier
{

    /**
     * @param {Object} event
     * @returns {boolean}
     */
    onCreatePlayerInventoryAfter(event)
    {
        let inventoryManager = event.inventoryServer?.manager;
        if(!inventoryManager){
            return false;
        }
        let playerSchema = event.playerSchema;
        inventoryManager.listenEvent(
            ItemsEvents.EQUIP_ITEM,
            (item) => this.applySkin(playerSchema, item),
            inventoryManager.getOwnerUniqueEventKey('skinEquipItem'),
            inventoryManager.getOwnerEventKey()
        );
        inventoryManager.listenEvent(
            ItemsEvents.UNEQUIP_ITEM,
            (item) => this.removeSkin(playerSchema, item),
            inventoryManager.getOwnerUniqueEventKey('skinUnequipItem'),
            inventoryManager.getOwnerEventKey()
        );
        return this.applySkin(playerSchema, this.findEquippedSkinItem(inventoryManager));
    }

    /**
     * @param {Object} playerSchema
     * @param {Object|boolean} item
     * @returns {boolean}
     */
    applySkin(playerSchema, item)
    {
        if(!item?.skinKey){
            return false;
        }
        playerSchema.avatarKey = item.skinKey;
        return true;
    }

    /**
     * @param {Object} playerSchema
     * @param {Object} item
     * @returns {boolean}
     */
    removeSkin(playerSchema, item)
    {
        if(!item?.skinKey){
            return false;
        }
        if(item.skinKey !== playerSchema.avatarKey){
            return false;
        }
        let equippedSkinItem = this.findEquippedSkinItem(playerSchema.inventory?.manager);
        if(equippedSkinItem){
            return this.applySkin(playerSchema, equippedSkinItem);
        }
        playerSchema.avatarKey = playerSchema.skillsServer?.classPath?.key || GameConst.IMAGE_PLAYER;
        return true;
    }

    /**
     * @param {Object} inventoryManager
     * @returns {Object|boolean}
     */
    findEquippedSkinItem(inventoryManager)
    {
        let items = inventoryManager?.items || {};
        for(let itemKey of Object.keys(items)){
            if(items[itemKey].skinKey && items[itemKey].equipped){
                return items[itemKey];
            }
        }
        return false;
    }

}

module.exports.PlayerSkinApplier = PlayerSkinApplier;
