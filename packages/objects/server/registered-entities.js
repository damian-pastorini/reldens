/**
 *
 * Reldens - Registered Entities
 *
 */

const { ObjectsAnimationsModel } = require('./animations-model');
const { ObjectsModel } = require('./model');
const { ObjectsAssetsModel } = require('./assets-model');
const { ObjectsEntity } = require('./entities/objects-entity');
const { ObjectsAnimationsEntity } = require('./entities/objects-animations-entity');
const { ObjectsAssetsEntity } = require('./entities/objects-assets-entity');

let entitiesTranslations = {
    labels: {
        objects: 'Objects',
        objects_animations: 'Animations',
        objects_assets: 'Assets'
    }
};

let rawRegisteredEntities = {
    objectsAnimations: ObjectsAnimationsModel,
    objectsModel: ObjectsModel,
    objectsAssets: ObjectsAssetsModel
};

let objectsConfig = {
    parentItemLabel: 'Game Objects',
    icon: 'WatsonHealth3DSoftware'
};

let entitiesConfig = {
    objectsModel: ObjectsEntity.propertiesConfig(objectsConfig),
    objectsAnimations: ObjectsAnimationsEntity.propertiesConfig(objectsConfig),
    objectsAssets: ObjectsAssetsEntity.propertiesConfig(objectsConfig)
};

module.exports.rawRegisteredEntities = rawRegisteredEntities;

module.exports.entitiesConfig = entitiesConfig;

module.exports.entitiesTranslations = entitiesTranslations;
