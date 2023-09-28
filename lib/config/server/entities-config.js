/**
 *
 * Reldens - Entities Config
 *
 */

const { ConfigEntity } = require('./entities/config-entity');
const { ConfigTypesEntity } = require('./entities/config-types-entity');

let configConfig = {
    parentItemLabel: 'Settings',
    icon: 'Settings'
};

let entitiesConfig = {
    config: ConfigEntity.propertiesConfig(Object.assign({sort: {sortBy: 'path'}}, configConfig)),
    configTypes: ConfigTypesEntity.propertiesConfig(configConfig)
};

module.exports.entitiesConfig = entitiesConfig;
