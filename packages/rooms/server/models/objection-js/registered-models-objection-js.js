/**
 *
 * Reldens - Registered Entities
 *
 */

const { RoomsModel } = require('./rooms-model');
const { RoomsChangePointsModel } = require('./change-points-model');
const { RoomsReturnPointsModel } = require('./return-points-model');
const { entitiesTranslations } = require('../../entities-translations');
const { entitiesConfig } = require('../../entiites-config');

let rawRegisteredEntities = {
    rooms: RoomsModel,
    roomsChangePoints: RoomsChangePointsModel,
    roomsReturnPoints: RoomsReturnPointsModel
};

module.exports.rawRegisteredEntities = rawRegisteredEntities;

module.exports.entitiesConfig = entitiesConfig;

module.exports.entitiesTranslations = entitiesTranslations;
