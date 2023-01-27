/**
 *
 * Reldens - Registered Entities
 *
 */

const {RewardsModel} = require('./rewards-model');
const {entitiesTranslations} = require('../../entities-translations');
const {entitiesConfig} = require('../../entities-config');

let rawRegisteredEntities = {
    rewards: RewardsModel,
};

module.exports.rawRegisteredEntities = rawRegisteredEntities;

module.exports.entitiesConfig = entitiesConfig;

module.exports.entitiesTranslations = entitiesTranslations;
