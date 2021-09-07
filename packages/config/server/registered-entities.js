/**
 *
 * Reldens - Registered Entities
 *
 */

const { ConfigModel } = require('./model');
const { ConfigEntity } = require('./entities/config-entity');

let rawRegisteredEntities = {
    config: ConfigModel
};

let configConfig = {
    parentItemLabel: null,
    icon: 'Settings',
    sort: {
        sortBy: 'path'
    }
};

let entitiesConfig = {
    config: ConfigEntity.propertiesConfig(configConfig)
};

module.exports.rawRegisteredEntities = rawRegisteredEntities;

module.exports.entitiesConfig = entitiesConfig;
