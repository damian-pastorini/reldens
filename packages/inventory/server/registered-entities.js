/**
 *
 * Reldens - Registered Entities
 *
 */

const ItemsPackModels = require('@reldens/items-system/lib/server/storage/models/index');
const { GroupEntity } = require('./entities/group-entity');
const { InventoryEntity } = require('./entities/inventory-entity');
const { ItemEntity } = require('./entities/item-entity');
const { ModifiersEntity } = require('./entities/modifiers-entity');

let entitiesTranslations = {
    labels: {
        items_item: 'Items',
        items_group: 'Groups',
        items_inventory: 'Players Inventory',
        items_item_modifiers: 'Modifiers'
    }
};

let rawRegisteredEntities = ItemsPackModels;

let itemsConfig = {
    parentItemLabel: 'Items & Inventory',
    icon: 'Box'
};

let entitiesConfig = {
    item: ItemEntity.propertiesConfig(itemsConfig),
    group: GroupEntity.propertiesConfig(itemsConfig),
    inventory: InventoryEntity.propertiesConfig(itemsConfig),
    modifiers: ModifiersEntity.propertiesConfig(itemsConfig)
};

module.exports.rawRegisteredEntities = rawRegisteredEntities;

module.exports.entitiesConfig = entitiesConfig;

module.exports.entitiesTranslations = entitiesTranslations;
