/**
 *
 * Reldens - Registered Entities
 *
 */

const { FeaturesModel } = require('./features-model');
const { entitiesConfig } = require('../../entities-config');

let rawRegisteredEntities = {
    features: FeaturesModel
};

module.exports.rawRegisteredEntities = rawRegisteredEntities;

module.exports.entitiesConfig = entitiesConfig;
