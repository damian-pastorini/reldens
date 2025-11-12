/**
 *
 * Reldens - ModelsManager
 *
 * This class contains all the Objection models examples, so we can have a single entry point for all of them and
 * additionally get shortcuts to process the information from the events and run the proper actions in the storage.
 *
 */

const { ItemsEvents } = require('@reldens/items-system');
const { Logger, sc } = require('@reldens/utils');

class ModelsManager
{

    constructor(props)
    {
        this.dataServer = sc.get(props, 'dataServer', false);
        this.inventoryRepository = this.getEntity('itemsInventory');
    }

    getEntity(entityName)
    {
        if(!this.dataServer){
            Logger.error('No dataServer found on inventory ModelsManager.');
            return false;
        }
        return this.dataServer.entityManager.get(entityName);
    }

    async loadOwnerItems(ownerId)
    {
        if(!this.dataServer){
            Logger.error('No dataServer found on inventory ModelsManager.');
            return false;
        }
        return await this.inventoryRepository.loadByWithRelations(
            'owner_id',
            ownerId,
            ['related_items_item.related_items_item_modifiers']
        );
    }

    async saveNewItem(inventory, item)
    {
        let itemData = {
            id: null, // id will be always null for new items since it's an auto-increment in the storage.
            owner_id: inventory.getOwnerId(),
            item_id: item.item_id,
            qty: item.qty
        };
        if(sc.hasOwn(item, 'remaining_uses')){
            itemData.remaining_uses = item.remaining_uses;
        }
        if(sc.hasOwn(item, 'is_active')){
            itemData.is_active = item.is_active;
        }
        let itemModel = await this.inventoryRepository.create(itemData);
        item.id = itemModel.id;
        return item;
    }

    async deleteItem(inventory, itemKey)
    {
        return await this.inventoryRepository.deleteById(inventory.items[itemKey].id);
    }

    async updateItemQuantity(item)
    {
        return await this.inventoryRepository.updateById(item.id, {qty: item.qty});
    }

    async onEquipItem(item)
    {
        return await this.inventoryRepository.updateById(item.id, {is_active: 1});
    }

    async onUnequipItem(item)
    {
        return await this.inventoryRepository.updateById(item.id, {is_active: 0});
    }

    async onChangedModifiers(item, action)
    {
        // owners will persist their own data after the modifiers were applied:
        return await item.manager.owner.persistData({act: action, item: item});
    }

    async onExecutedItem(item)
    {
        if(item.uses === 0){
            await this.inventoryRepository.deleteById(item.id);
        }
        return await item.manager.owner.persistData({act: ItemsEvents.EXECUTED_ITEM, item: item});
    }

}

module.exports.ModelsManager = ModelsManager;
