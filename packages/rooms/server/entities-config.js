/**
 *
 * Reldens - Entities Config
 *
 */

const { RoomsEntity } = require('./entities/rooms-entity');
const { RoomsChangePointsEntity } = require('./entities/rooms-change-points-entity');
const { RoomsReturnPointsEntity } = require('./entities/rooms-return-points-entity');

let propertiesConfig = {
    parentItemLabel: 'Rooms',
    icon: 'Wikis'
};

let entitiesConfig = {
    rooms: RoomsEntity.propertiesConfig(propertiesConfig),
    roomsChangePoints: RoomsChangePointsEntity.propertiesConfig(propertiesConfig),
    roomsReturnPoints: RoomsReturnPointsEntity.propertiesConfig(propertiesConfig)
};

module.exports.entitiesConfig = entitiesConfig;
