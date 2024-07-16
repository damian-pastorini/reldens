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

let entitiesConfig = (projectConfig) => { return {
    rewards: RewardsEntity.propertiesConfig(objectsConfig),
    rewardsModifiers: RewardsModifiersEntity.propertiesConfig(objectsConfig),
    dropsAnimations: DropsAnimationsEntity.propertiesConfig(objectsConfig, projectConfig)
}};

module.exports.entitiesConfig = entitiesConfig;
