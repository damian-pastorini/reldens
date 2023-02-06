/**
 *
 * Reldens - Rewards Entities Config
 *
 */

const { RewardsEntity } = require('./entities/rewards-entity');
const { RewardsModifiersEntity } = require('./entities/rewards-modifiers-entity');

let objectsConfig = {
    parentItemLabel: 'Game Objects',
    icon: 'WatsonHealth3DSoftware'
};

let entitiesConfig = {
    rewards: RewardsEntity.propertiesConfig(objectsConfig),
    rewardsModifiers: RewardsModifiersEntity.propertiesConfig(objectsConfig)
};

module.exports.entitiesConfig = entitiesConfig;
