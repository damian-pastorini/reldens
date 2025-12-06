/**
 *
 * Reldens - Entities Config
 *
 */

const { ItemsInventoryEntityOverride } = require('./entities/items-inventory-entity-override');
const { ItemsItemEntityOverride } = require('./entities/items-item-entity-override');
const { ItemsGroupEntityOverride } = require('./entities/items-group-entity-override');

module.exports.entitiesConfig = {
    itemsInventory: ItemsInventoryEntityOverride,
    itemsItem: ItemsItemEntityOverride,
    itemsGroup: ItemsGroupEntityOverride
};
