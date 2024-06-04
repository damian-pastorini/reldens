/**
 *
 * Reldens - Rewards Entities Config
 *
 */

const { RewardsEntity } = require('./entities/rewards-entity');
const { RewardsModifiersEntity } = require('./entities/rewards-modifiers-entity');
const { DropsAnimationsEntity } = require('./entities/drops-animations-entity');

let objectsConfig = {
    parentItemLabel: 'Rewards',
    icon: 'WatsonHealth3DSoftware'
};

let entitiesConfig = {
    rewards: RewardsEntity.propertiesConfig(objectsConfig),
    rewardsModifiers: RewardsModifiersEntity.propertiesConfig(objectsConfig),
    dropsAnimations: DropsAnimationsEntity.propertiesConfig(objectsConfig)
};

module.exports.entitiesConfig = entitiesConfig;
