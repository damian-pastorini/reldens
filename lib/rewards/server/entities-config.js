/**
 *
 * Reldens - Rewards Entities Config
 *
 */

const { RewardsEntity } = require('./entities/rewards-entity');
const { RewardsModifiersEntity } = require('./entities/rewards-modifiers-entity');
const { RewardsEventsEntity } = require('./entities/rewards-events-entity');
const { RewardsEventsStateEntity } = require('./entities/rewards-events-state-entity');
const { DropsAnimationsEntity } = require('./entities/drops-animations-entity');

let objectsConfig = {parentItemLabel: 'Rewards'};

let entitiesConfig = (projectConfig) => { return {
    rewards: RewardsEntity.propertiesConfig(objectsConfig),
    rewardsModifiers: RewardsModifiersEntity.propertiesConfig(objectsConfig),
    rewardsEvents : RewardsEventsEntity.propertiesConfig(objectsConfig),
    rewardsEventsState : RewardsEventsStateEntity.propertiesConfig(objectsConfig),
    dropsAnimations: DropsAnimationsEntity.propertiesConfig(objectsConfig, projectConfig)
}};

module.exports.entitiesConfig = entitiesConfig;
