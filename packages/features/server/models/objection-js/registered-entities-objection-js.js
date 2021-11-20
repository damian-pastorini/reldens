/**
 *
 * Reldens - Registered Entities
 *
 */

const { FeaturesModel } = require('./features-model');
const { FeaturesEntity } = require('../../entities/features-entity');

let rawRegisteredEntities = {
    features: FeaturesModel
};

let featuresConfig = {
    parentItemLabel: null,
    icon: 'Plug'
};

let entitiesConfig = {
    features: FeaturesEntity.propertiesConfig(featuresConfig)
};

module.exports.rawRegisteredEntities = rawRegisteredEntities;

module.exports.entitiesConfig = entitiesConfig;
