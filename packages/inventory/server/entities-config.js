/**
 *
 * Reldens - Entities Config
 *
 */

const { GroupEntity } = require('./entities/group-entity');
const { InventoryEntity } = require('./entities/inventory-entity');
const { ItemEntity } = require('./entities/item-entity');
const { ModifiersEntity } = require('./entities/modifiers-entity');

let itemsConfig = {
    parentItemLabel: 'Items & Inventory',
    icon: 'Box'
};

let entitiesConfig = (projectConfig) => { return {
    item: ItemEntity.propertiesConfig(itemsConfig),
    group: GroupEntity.propertiesConfig(itemsConfig, projectConfig),
    inventory: InventoryEntity.propertiesConfig(itemsConfig),
    modifiers: ModifiersEntity.propertiesConfig(itemsConfig)
}};

module.exports.entitiesConfig = entitiesConfig;
