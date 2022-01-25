/**
 *
 * Reldens - Entities Config
 *
 */

const { RespawnEntity } = require('./entities/respawn-entity');

let objectsConfig = {
    parentItemLabel: null,
    icon: 'FishMultiple'
};

let entitiesConfig = {
    respawn: RespawnEntity.propertiesConfig(objectsConfig)
};

module.exports.entitiesConfig = entitiesConfig;
