/**
 *
 * Reldens - Registered Entities
 *
 */

const { RewardsModel } = require('./rewards-model');
const { RewardsModifiersModel } = require('./rewards-modifiers-model');
const { ObjectsItemsRewardsAnimationsModel } = require('./objects-items-rewards-animations-model');
const { entitiesTranslations } = require('../../entities-translations');
const { entitiesConfig } = require('../../entities-config');

let rawRegisteredEntities = {
    rewards: RewardsModel,
    rewardsModifiers: RewardsModifiersModel,
    objectsItemsRewardsAnimations: ObjectsItemsRewardsAnimationsModel,
};

module.exports.rawRegisteredEntities = rawRegisteredEntities;

module.exports.entitiesConfig = entitiesConfig;

module.exports.entitiesTranslations = entitiesTranslations;
