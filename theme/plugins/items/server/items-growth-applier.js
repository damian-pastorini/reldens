/**
 *
 * Reldens - Theme - ItemsGrowthApplier
 *
 * Grows the inventory items with a "growth" custom data: every item instance keeps its own level and experience in the
 * customData of its items_inventory row, receives its share of the experience gained by the owner (only while equipped
 * when "requireEquipped" is enabled) and its modifiers values are increased on every level.
 *
 */

const { ItemGrowthCalculator } = require('reldens/lib/inventory/server/item-growth-calculator');
const { InventoryConst } = require('reldens/lib/inventory/constants');
const { MessageFactory } = require('reldens/lib/chat/message-factory');
const { ChatConst } = require('reldens/lib/chat/constants');
const { ItemsEvents, SkillsEvents, sc } = require('reldens/lib/game/constants');

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
        inventoryManager.listenEvent(
            ItemsEvents.ADD_ITEM,
            (inventory, item) => this.initializeAddedItem(item),
            inventoryManager.getOwnerUniqueEventKey('growthAddItem'),
            inventoryManager.getOwnerEventKey()
        );
        let classPath = event.playerSchema.skillsServer?.classPath;
        classPath?.listenEvent(
            SkillsEvents.LEVEL_EXPERIENCE_ADDED,
            async (levelsSet, experienceAdded) => await this.addOwnerExperience(event.playerSchema, experienceAdded),
            classPath.getOwnerUniqueEventKey('growthExperienceAdded'),
            classPath.getOwnerEventKey()
        );
        let growableItems = this.fetchGrowableItems(inventoryManager);
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
            item.growthLevel = Number(item.inventoryCustomData.growth?.level) || InventoryConst.GROWTH.DEFAULT_LEVEL;
            item.growthExperience = Number(item.inventoryCustomData.growth?.experience) || 0;
            this.scaleModifiers(item);
        }
        return true;
    }

    /**
     * @param {Object} item
     * @returns {boolean}
     */
    initializeAddedItem(item)
    {
        if(!item?.growth){
            return false;
        }
        item.inventoryCustomData = {};
        item.growthLevel = InventoryConst.GROWTH.DEFAULT_LEVEL;
        item.growthExperience = 0;
        this.scaleModifiers(item);
        return true;
    }

    /**
     * @param {Object} playerSchema
     * @param {number} experienceAdded
     * @returns {Promise<number>}
     */
    async addOwnerExperience(playerSchema, experienceAdded)
    {
        let inventoryManager = playerSchema?.inventory?.manager;
        if(!inventoryManager){
            return 0;
        }
        let grownItems = 0;
        for(let item of this.fetchGrowableItems(inventoryManager)){
            if(await this.addItemExperience(item, playerSchema, experienceAdded)){
                grownItems++;
            }
        }
        return grownItems;
    }

    /**
     * @param {Object} item
     * @param {Object} playerSchema
     * @param {number} experienceAdded
     * @returns {Promise<boolean>}
     */
    async addItemExperience(item, playerSchema, experienceAdded)
    {
        if(false !== item.growth.requireEquipped && !item.equipped){
            return false;
        }
        let itemExperience = ItemGrowthCalculator.experienceFor(item.growth.experienceShare, experienceAdded);
        if(0 === itemExperience){
            return false;
        }
        let currentLevel = Number(item.growthLevel) || InventoryConst.GROWTH.DEFAULT_LEVEL;
        item.growthLevel = currentLevel;
        item.growthExperience = (Number(item.growthExperience) || 0) + itemExperience;
        let reachedLevel = ItemGrowthCalculator.levelFor(item.growthExperience, item.growth.levels, currentLevel);
        if(reachedLevel > currentLevel){
            await this.levelUpItem(item, playerSchema, reachedLevel);
        }
        item.inventoryCustomData = Object.assign({}, item.inventoryCustomData, {
            growth: {level: item.growthLevel, experience: item.growthExperience}
        });
        await this.inventoryRepository.updateById(item.id, {customData: sc.toJsonString(item.inventoryCustomData)});
        return true;
    }

    /**
     * @param {Object} item
     * @param {Object} playerSchema
     * @param {number} reachedLevel
     * @returns {Promise<boolean>}
     */
    async levelUpItem(item, playerSchema, reachedLevel)
    {
        let wasEquipped = Boolean(item.equipped);
        if(wasEquipped){
            await item.unequip();
        }
        item.growthLevel = reachedLevel;
        this.scaleModifiers(item);
        if(wasEquipped){
            await item.equip();
        }
        let inventoryClient = playerSchema.inventory?.client?.client;
        if(!inventoryClient){
            return true;
        }
        inventoryClient.send(MessageFactory.create(
            ChatConst.TYPES.SYSTEM,
            item.label+InventoryConst.GROWTH.MESSAGES.ITEM_REACHED_LEVEL+reachedLevel
            +InventoryConst.GROWTH.MESSAGES.SENTENCE_END
        ));
        return true;
    }

    /**
     * @param {Object} item
     */
    scaleModifiers(item)
    {
        let currentModifiers = item.modifiers || {};
        for(let modifierId of Object.keys(currentModifiers)){
            let modifier = currentModifiers[modifierId];
            if(-1 !== InventoryConst.GROWTH.NOT_SCALABLE_OPERATIONS.indexOf(modifier.operation)){
                continue;
            }
            modifier.value = ItemGrowthCalculator.scaledValue(
                modifier.originalValue,
                item.growthLevel,
                item.growth.modifiersIncreasePercentPerLevel
            );
        }
    }

    /**
     * @param {Object} inventoryManager
     * @returns {Array<Object>}
     */
    fetchGrowableItems(inventoryManager)
    {
        let items = inventoryManager.items || {};
        return Object.keys(items).map(itemKey => items[itemKey]).filter(item => item?.growth && item.id);
    }

}

module.exports.ItemsGrowthApplier = ItemsGrowthApplier;
