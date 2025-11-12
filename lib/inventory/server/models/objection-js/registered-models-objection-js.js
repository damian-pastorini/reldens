/**
 *
 * Reldens - Registered Entities
 *
 */

const { ItemModel } = require('./item-model');
const { ItemGroupModel } = require('./item-group-model');
const { InventoryModel } = require('./inventory-model');
const { ItemModifiersModel } = require('./item-modifiers-model');
const { ItemTypesModel } = require('./item-types-model');
const { entitiesTranslations } = require('../../entities-translations');
const { entitiesConfig } = require('../../entities-config');

module.exports.rawRegisteredEntities = {
    item: ItemModel,
    itemGroup: ItemGroupModel,
    inventory: InventoryModel,
    itemModifiers: ItemModifiersModel,
    itemTypes: ItemTypesModel
};

module.exports.entitiesConfig = entitiesConfig;

module.exports.entitiesTranslations = entitiesTranslations;
