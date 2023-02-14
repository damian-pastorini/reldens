/**
 *
 * Reldens - Rewards Entities Config
 *
 */

const { RewardsEntity } = require('./entities/rewards-entity');
const { RewardsModifiersEntity } = require('./entities/rewards-modifiers-entity');
const { ObjectsItemsRewardsAnimationsEntity } = require('./entities/objects-items-rewards-animations-entity');

let objectsConfig = {
    parentItemLabel: 'Game Objects',
    icon: 'WatsonHealth3DSoftware'
};

let entitiesConfig = {
    rewards: RewardsEntity.propertiesConfig(objectsConfig),
    rewardsModifiers: RewardsModifiersEntity.propertiesConfig(objectsConfig),
    objectsItemsRewardsAnimations: ObjectsItemsRewardsAnimationsEntity.propertiesConfig(objectsConfig)
};

module.exports.entitiesConfig = entitiesConfig;
