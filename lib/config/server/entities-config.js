/**
 *
 * Reldens - Entities Config
 *
 */

const { ConfigEntity } = require('./entities/config-entity');

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

module.exports.entitiesConfig = entitiesConfig;
