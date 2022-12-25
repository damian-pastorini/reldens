/**
 *
 * Reldens - Registered Entities
 *
 */

const { ObjectsAnimationsModel } = require('./animations-model');
const { ObjectsModel } = require('./objects-model');
const { ObjectsAssetsModel } = require('./assets-model');
const { ObjectsInventoryModel } = require('./objects-inventory-model');
const { ObjectsItemsRequirementsModel } = require('./objects-items-requirements-model');
const { ObjectsItemsRewardsModel } = require('./objects-items-rewards-model');
const { ObjectsSkillsModel } = require('./objects-skills-model');
const { entitiesTranslations } = require('../../entities-translations');
const { entitiesConfig } = require('../../entities-config');

let rawRegisteredEntities = {
    objectsAnimations: ObjectsAnimationsModel,
    objects: ObjectsModel,
    objectsAssets: ObjectsAssetsModel,
    objectsInventory: ObjectsInventoryModel,
    objectsItemsRequirements: ObjectsItemsRequirementsModel,
    objectsItemsRewards: ObjectsItemsRewardsModel,
    objectsSkills: ObjectsSkillsModel
};

module.exports.rawRegisteredEntities = rawRegisteredEntities;

module.exports.entitiesConfig = entitiesConfig;

module.exports.entitiesTranslations = entitiesTranslations;
