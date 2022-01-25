/**
 *
 * Reldens - Entities Config
 *
 */

const { FeaturesEntity } = require('./entities/features-entity');

let featuresConfig = {
    parentItemLabel: null,
    icon: 'Plug'
};

let entitiesConfig = {
    features: FeaturesEntity.propertiesConfig(featuresConfig)
};

module.exports.entitiesConfig = entitiesConfig;
