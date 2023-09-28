/**
 *
 * Reldens - Registered Entities
 *
 */

const { ItemTypesModel } = require('./item-types-model');
const { rawRegisteredEntities } = require('@reldens/items-system/lib/server/storage/models/objection-js/registered-models-objection-js');
const { entitiesTranslations } = require('../../entities-translations');
const { entitiesConfig } = require('../../entities-config');

rawRegisteredEntities.itemTypes = ItemTypesModel

module.exports.rawRegisteredEntities = rawRegisteredEntities;

module.exports.entitiesConfig = entitiesConfig;

module.exports.entitiesTranslations = entitiesTranslations;
