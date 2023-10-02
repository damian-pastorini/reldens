/**
 *
 * Reldens - Registered Entities
 *
 */

const { ConfigModel } = require('./config-model');
const { ConfigTypesModel } = require('./config-types-model');
const { entitiesConfig } = require('../../entities-config');

let rawRegisteredEntities = {
    config: ConfigModel,
    configTypes: ConfigTypesModel
};

module.exports.rawRegisteredEntities = rawRegisteredEntities;

module.exports.entitiesConfig = entitiesConfig;
