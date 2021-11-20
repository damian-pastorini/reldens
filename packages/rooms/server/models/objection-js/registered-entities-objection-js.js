/**
 *
 * Reldens - Registered Entities
 *
 */

const { RoomsModel } = require('./rooms-model');
const { RoomsChangePointsModel } = require('./change-points-model');
const { RoomsReturnPointsModel } = require('./return-points-model');
const { RoomsEntity } = require('../../entities/rooms-entity');
const { RoomsChangePointsEntity } = require('../../entities/rooms-change-points-entity');
const { RoomsReturnPointsEntity } = require('../../entities/rooms-return-points-entity');

let entitiesTranslations = {
    labels: {
        rooms: 'Rooms',
        rooms_change_points: 'Change Points',
        rooms_return_points: 'Return Points'
    }
};

let rawRegisteredEntities = {
    rooms: RoomsModel,
    roomsChangePoints: RoomsChangePointsModel,
    roomsReturnPoints: RoomsReturnPointsModel
};

let propertiesConfig = {
    parentItemLabel: 'Rooms',
    icon: 'Wikis'
};

let entitiesConfig = {
    rooms: RoomsEntity.propertiesConfig(propertiesConfig),
    roomsChangePoints: RoomsChangePointsEntity.propertiesConfig(propertiesConfig),
    roomsReturnPoints: RoomsReturnPointsEntity.propertiesConfig(propertiesConfig)
};

module.exports.rawRegisteredEntities = rawRegisteredEntities;

module.exports.entitiesConfig = entitiesConfig;

module.exports.entitiesTranslations = entitiesTranslations;
