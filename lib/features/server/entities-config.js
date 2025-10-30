/**
 *
 * Reldens - Entities Config
 *
 */

const { FeaturesEntity } = require('./entities/features-entity');

let entitiesConfig = {
    features: FeaturesEntity.propertiesConfig({})
};

module.exports.entitiesConfig = entitiesConfig;
