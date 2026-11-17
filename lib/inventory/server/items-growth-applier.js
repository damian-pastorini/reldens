/**
 *
 * Reldens - ItemsGrowthApplier
 *
 * Applies the items growth of @reldens/items-system (ItemGrowthLeveler) to the player inventory: every item instance
 * keeps its own level and experience in the customData of its items_inventory row, loaded on the join (the grown items
 * are sent again with the items update message) and saved on every experience added. Every new item starts at the
 * first level, the experience gained by the player (the class path LEVEL_EXPERIENCE_ADDED) is shared with the growing
 * items once their stored growth is loaded (an experience saved before would replace the stored growth), and on every
 * level up the item display data is calculated again before the item update is sent, followed by the translated level
 * reached message.
 *
 */

const { ItemsModifiersEnricher } = require('./items-modifiers-enricher');
const { InventoryConst } = require('../constants');
const { MessageFactory } = require('../../chat/message-factory');
const { ChatConst } = require('../../chat/constants');
const { ItemGrowthLeveler, ItemsEvents } = require('@reldens/items-system');
const { SkillsEvents } = require('@reldens/skills');
const { sc } = require('@reldens/utils');

class ItemsGrowthApplier
{

    /**
     * @param {Object} props
     * @param {Object} props.dataServer
     */
    constructor(props)
    {
        /** @type {Object} */
        this.inventoryRepository = props.dataServer.getEntity('itemsInventory');
        /** @type {ItemGrowthLeveler} */
        this.itemGrowthLeveler = new ItemGrowthLeveler();
    }

    /**
     * @param {Object} event
     * @returns {Promise<boolean>}
     */
    async onCreatePlayerInventoryAfter(event)
    {
        let inventoryManager = event.inventoryServer?.manager;
        if(!inventoryManager){
            return false;
        }
        this.listenInventoryEvents(inventoryManager, event.inventoryServer.client?.client);
        let storedGrowthLoaded = await this.loadStoredGrowth(inventoryManager);
        let classPath = event.playerSchema.skillsServer?.classPath;
        classPath?.listenEvent(
            SkillsEvents.LEVEL_EXPERIENCE_ADDED,
            async (levelsSet, experienceAdded) => await this.itemGrowthLeveler.addOwnerExperience(
                inventoryManager,
                experienceAdded
            ),
            classPath.getOwnerUniqueEventKey('growthExperienceAdded'),
            classPath.getOwnerEventKey()
        );
        return storedGrowthLoaded;
    }

    /**
     * @param {Object} inventoryManager
     * @param {Object} [inventoryClient]
     */
    listenInventoryEvents(inventoryManager, inventoryClient)
    {
        let ownerEventKey = inventoryManager.getOwnerEventKey();
        inventoryManager.listenEvent(
            ItemsEvents.ADD_ITEM_BEFORE,
            (inventory, item) => this.initializeAddedItem(item),
            inventoryManager.getOwnerUniqueEventKey('growthAddItem'),
            ownerEventKey
        );
        inventoryManager.listenEvent(
            ItemsEvents.GROWTH_LEVEL_UP,
            (item) => this.applyReachedLevel(item, inventoryClient),
            inventoryManager.getOwnerUniqueEventKey('growthLevelUp'),
            ownerEventKey
        );
        inventoryManager.listenEvent(
            ItemsEvents.GROWTH_EXPERIENCE_ADDED,
            async (item) => await this.saveItemGrowth(item),
            inventoryManager.getOwnerUniqueEventKey('growthExperienceSave'),
            ownerEventKey
        );
    }

    /**
     * @param {Object} inventoryManager
     * @returns {Promise<boolean>}
     */
    async loadStoredGrowth(inventoryManager)
    {
        let growableItems = this.itemGrowthLeveler.fetchGrowableItems(inventoryManager).filter(item => item.id);
        if(0 === growableItems.length){
            return false;
        }
        let itemsRows = await this.inventoryRepository.load({
            id: {operator: 'IN', value: growableItems.map(item => item.id)}
        });
        for(let itemRow of itemsRows || []){
            let item = growableItems.find(growableItem => growableItem.id === itemRow.id);
            if(!item){
                continue;
            }
            item.inventoryCustomData = sc.toJson(itemRow.customData, {});
            this.itemGrowthLeveler.initializeItem(
                item,
                item.inventoryCustomData.growth?.level,
                item.inventoryCustomData.growth?.experience
            );
            await inventoryManager.fireEvent(ItemsEvents.UPDATE_ITEM, ItemsModifiersEnricher.applyDisplayData(item));
        }
        return true;
    }

    /**
     * @param {Object} item
     * @returns {boolean}
     */
    initializeAddedItem(item)
    {
        let isGrowingItem = this.itemGrowthLeveler.initializeItem(item);
        if(isGrowingItem){
            item.inventoryCustomData = {};
        }
        ItemsModifiersEnricher.applyDisplayData(item);
        return isGrowingItem;
    }

    /**
     * @param {Object} item
     * @param {Object} [inventoryClient]
     * @returns {boolean}
     */
    applyReachedLevel(item, inventoryClient)
    {
        ItemsModifiersEnricher.applyDisplayData(item);
        if(!inventoryClient){
            return false;
        }
        inventoryClient.send(MessageFactory.create(
            ChatConst.TYPES.SYSTEM,
            InventoryConst.SNIPPETS.ITEM_REACHED_LEVEL,
            {itemLabel: item.label, level: item.growthLevel}
        ));
        return true;
    }

    /**
     * @param {Object} item
     * @returns {Promise<boolean>}
     */
    async saveItemGrowth(item)
    {
        if(!item.id){
            return false;
        }
        item.inventoryCustomData = Object.assign({}, item.inventoryCustomData, {
            growth: {level: item.growthLevel, experience: item.growthExperience}
        });
        await this.inventoryRepository.updateById(item.id, {customData: sc.toJsonString(item.inventoryCustomData)});
        return true;
    }

}

module.exports.ItemsGrowthApplier = ItemsGrowthApplier;
