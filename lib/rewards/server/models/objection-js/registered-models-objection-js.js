/**
 *
 * Reldens - Registered Entities
 *
 */

const { RewardsModel } = require('./rewards-model');
const { RewardsModifiersModel } = require('./rewards-modifiers-model');
const { RewardsEventsModel } = require('./rewards-events-model');
const { RewardsEventsStateModel } = require('./rewards-events-state-model');
const { DropsAnimationsModel } = require('./drops-animations-model');
const { entitiesTranslations } = require('../../entities-translations');
const { entitiesConfig } = require('../../entities-config');

let rawRegisteredEntities = {
    rewards: RewardsModel,
    rewardsModifiers: RewardsModifiersModel,
    rewardsEvents: RewardsEventsModel,
    rewardsEventsState: RewardsEventsStateModel,
    dropsAnimations: DropsAnimationsModel
};

module.exports.rawRegisteredEntities = rawRegisteredEntities;

module.exports.entitiesConfig = entitiesConfig;

module.exports.entitiesTranslations = entitiesTranslations;
