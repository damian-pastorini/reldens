/**
 *
 * Reldens - Entities Config
 *
 */

const { RoomsEntity } = require('./entities/rooms-entity');
const { RoomsChangePointsEntity } = require('./entities/rooms-change-points-entity');
const { RoomsReturnPointsEntity } = require('./entities/rooms-return-points-entity');

let propertiesConfig = {parentItemLabel: 'Rooms'};

let entitiesConfig = (projectConfig) => { return {
    rooms: RoomsEntity.propertiesConfig(propertiesConfig, projectConfig),
    roomsChangePoints: RoomsChangePointsEntity.propertiesConfig(propertiesConfig),
    roomsReturnPoints: RoomsReturnPointsEntity.propertiesConfig(propertiesConfig)
}};

module.exports.entitiesConfig = entitiesConfig;
