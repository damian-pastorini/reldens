/**
 *
 * Reldens - Entities Config
 *
 */

const { ItemGroupEntity } = require('./entities/item-group-entity');
const { InventoryEntity } = require('./entities/inventory-entity');
const { ItemEntity } = require('./entities/item-entity');
const { ItemModifiersEntity } = require('./entities/item-modifiers-entity');
const { ItemTypesEntity } = require('./entities/item-types-entity');

let itemsConfig = {
    parentItemLabel: 'Items & Inventory',
    icon: 'Box'
};

let usersPathMenu = {
    parentItemLabel: 'Users',
    icon: 'Users'
}

let entitiesConfig = (projectConfig) => { return {
    item: ItemEntity.propertiesConfig(itemsConfig),
    itemGroup: ItemGroupEntity.propertiesConfig(itemsConfig, projectConfig),
    inventory: InventoryEntity.propertiesConfig(usersPathMenu),
    itemModifiers: ItemModifiersEntity.propertiesConfig(itemsConfig),
    itemTypes: ItemTypesEntity.propertiesConfig(itemsConfig)
}};

module.exports.entitiesConfig = entitiesConfig;
