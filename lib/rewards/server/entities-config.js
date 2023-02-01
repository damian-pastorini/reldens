/**
 *
 * Reldens - Rewards Entities Config
 *
 */

const { RewardsEntity } = require('./entities/rewards-entity');

let objectsConfig = {
    parentItemLabel: 'Object',
    icon: 'WatsonHealth3DSoftware'
};

let entitiesConfig = {
    rewards: RewardsEntity.propertiesConfig(objectsConfig)
};

module.exports.entitiesConfig = entitiesConfig;
