/**
 *
 * Reldens - Entities Config
 *
 */

const { ItemGroupEntity } = require('./entities/item-group-entity');
const { InventoryEntity } = require('./entities/inventory-entity');
const { ItemEntity } = require('./entities/item-entity');
const { ItemModifiersEntity } = require('./entities/item-modifiers-entity');

let itemsConfig = {
    parentItemLabel: 'Items & Inventory',
    icon: 'Box'
};

let entitiesConfig = (projectConfig) => { return {
    item: ItemEntity.propertiesConfig(itemsConfig),
    itemGroup: ItemGroupEntity.propertiesConfig(itemsConfig, projectConfig),
    inventory: InventoryEntity.propertiesConfig(itemsConfig),
    itemModifiers: ItemModifiersEntity.propertiesConfig(itemsConfig)
}};

module.exports.entitiesConfig = entitiesConfig;
