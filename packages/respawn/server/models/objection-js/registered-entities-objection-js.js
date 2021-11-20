/**
 *
 * Reldens - Registered Entities
 *
 */

const { RespawnModel } = require('./respawn-model');
const { RespawnEntity } = require('../../entities/respawn-entity');

let entitiesTranslations = {
    labels: {
        respawn: 'Respawn Areas'
    }
};

let rawRegisteredEntities = {
    respawn: RespawnModel
};

let objectsConfig = {
    parentItemLabel: null,
    icon: 'FishMultiple'
};

let entitiesConfig = {
    respawn: RespawnEntity.propertiesConfig(objectsConfig)
};

module.exports.rawRegisteredEntities = rawRegisteredEntities;

module.exports.entitiesConfig = entitiesConfig;

module.exports.entitiesTranslations = entitiesTranslations;
