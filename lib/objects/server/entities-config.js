/**
 *
 * Reldens - Entities Config
 *
 */

const { ObjectsEntity } = require('./entities/objects-entity');
const { ObjectsAnimationsEntity} = require('./entities/objects-animations-entity');
const { ObjectsAssetsEntity } = require('./entities/objects-assets-entity');
const { ObjectsInventoryEntity } = require('./entities/objects-inventory-entity');
const { ObjectsItemsRequirementsEntity } = require('./entities/objects-items-requirements-entity');
const { ObjectsItemsRewardsEntity } = require('./entities/objects-items-rewards-entity');
const { ObjectsSkillsEntity } = require('./entities/objects-skills-entity');
const { ObjectsStatsEntity } = require('./entities/objects-stats-entity');
const { ObjectsTypesEntity } = require('./entities/objects-types-entity');
const { TargetOptionsEntity } = require('./entities/target-options-entity');

let objectsConfig = {parentItemLabel: 'Game Objects'};

let entitiesConfig = {
    objects: ObjectsEntity.propertiesConfig(objectsConfig),
    objectsAnimations: ObjectsAnimationsEntity.propertiesConfig(objectsConfig),
    objectsAssets: ObjectsAssetsEntity.propertiesConfig(objectsConfig),
    objectsInventory: ObjectsInventoryEntity.propertiesConfig(objectsConfig),
    objectsItemsRequirements: ObjectsItemsRequirementsEntity.propertiesConfig(objectsConfig),
    objectsItemsRewards: ObjectsItemsRewardsEntity.propertiesConfig(objectsConfig),
    objectsSkills: ObjectsSkillsEntity.propertiesConfig(objectsConfig),
    objectsStats: ObjectsStatsEntity.propertiesConfig(objectsConfig),
    objectsTypes: ObjectsTypesEntity.propertiesConfig(objectsConfig),
    targetOptions: TargetOptionsEntity.propertiesConfig(objectsConfig)
};

module.exports.entitiesConfig = entitiesConfig;
