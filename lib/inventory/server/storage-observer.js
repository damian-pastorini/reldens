/**
 *
 * Reldens - StorageObserver
 *
 * This class listens for all the inventory actions and processes the information to persist it in the storage.
 * This implements the models manager to avoid having a specific driver call: the default models manager uses
 * Objection JS, but this could be changed for a different custom models manager.
 *
 */

const { ModelsManager } = require('./models-manager');
const { ItemsFactory } = require('./items-factory');
const { ItemsEvents } = require('@reldens/items-system');
const { ModifierConst } = require('@reldens/modifiers');

class StorageObserver
{

    constructor(manager, modelsManager = false)
    {
        this.manager = manager;
        this.modelsManager = false !== modelsManager ? modelsManager : new ModelsManager();
        if(false === this.modelsManager.dataServer.initialized){
            this.modelsManager.dataServer.connect();
        }
    }

    listenEvents()
    {
        let masterKey = this.manager.getOwnerEventKey();
        this.manager.listenEvent(
            ItemsEvents.ADD_ITEM_BEFORE,
            this.saveNewItem.bind(this),
            this.manager.getOwnerUniqueEventKey('addItemBeforeStore'),
            masterKey
        );
        this.manager.listenEvent(
            ItemsEvents.REMOVE_ITEM,
            this.removeItem.bind(this),
            this.manager.getOwnerUniqueEventKey('removeItemStore'),
            masterKey
        );
        this.manager.listenEvent(
            ItemsEvents.MODIFY_ITEM_QTY,
            this.updateItemQuantity.bind(this),
            this.manager.getOwnerUniqueEventKey('modifyItemStore'),
            masterKey
        );
        this.manager.listenEvent(
            ItemsEvents.EQUIP_ITEM,
            this.saveEquippedItemAsActive.bind(this),
            this.manager.getOwnerUniqueEventKey('equipItemStore'),
            masterKey
        );
        this.manager.listenEvent(
            ItemsEvents.UNEQUIP_ITEM,
            this.saveUnequippedItemAsInactive.bind(this),
            this.manager.getOwnerUniqueEventKey('unequipItemStore'),
            masterKey
        );
        // @NOTE: check Item class changeModifiers method.
        this.manager.listenEvent(
            ItemsEvents.EQUIP+'AppliedModifiers',
            this.updateAppliedModifiers.bind(this),
            this.manager.getOwnerUniqueEventKey('modifiersAppliedStore'),
            masterKey
        );
        this.manager.listenEvent(
            ItemsEvents.EQUIP+'RevertedModifiers',
            this.updateRevertedModifiers.bind(this),
            this.manager.getOwnerUniqueEventKey('modifiersRevertedStore'),
            masterKey
        );
        this.manager.listenEvent(
            ItemsEvents.EXECUTED_ITEM,
            this.processAndStoreItemExecutionData.bind(this),
            this.manager.getOwnerUniqueEventKey('executedItemStore'),
            masterKey
        );
    }

    async processAndStoreItemExecutionData(item)
    {
        return await this.modelsManager.onExecutedItem(item);
    }

    async updateRevertedModifiers(item)
    {
        return await this.modelsManager.onChangedModifiers(item, ModifierConst.MOD_REVERTED);
    }

    async updateAppliedModifiers(item)
    {
        return await this.modelsManager.onChangedModifiers(item, ModifierConst.MOD_APPLIED);
    }

    async saveUnequippedItemAsInactive(item)
    {
        return await this.modelsManager.onUnequipItem(item);
    }

    async saveEquippedItemAsActive(item)
    {
        return await this.modelsManager.onEquipItem(item);
    }

    async updateItemQuantity(item, inventory, op, key, qty)
    {
        return await this.modelsManager.updateItemQuantity(item, inventory, op, key, qty);
    }

    async removeItem(inventory, itemKey)
    {
        return await this.modelsManager.deleteItem(inventory, itemKey);
    }

    async saveNewItem(inventory, item)
    {
        return await this.modelsManager.saveNewItem(inventory, item);
    }

    async loadOwnerItems()
    {
        let itemsModels = await this.modelsManager.loadOwnerItems(this.manager.getOwnerId());
        if(0 === itemsModels.length){
            return false;
        }
        let itemsInstances = await ItemsFactory.fromModelsList(itemsModels, this.manager);
        if(false === itemsInstances){
            return false;
        }
        await this.manager.fireEvent(ItemsEvents.LOADED_OWNER_ITEMS, this, itemsInstances, itemsModels);
        await this.manager.setItems(itemsInstances);
    }

}

module.exports.StorageObserver = StorageObserver;
