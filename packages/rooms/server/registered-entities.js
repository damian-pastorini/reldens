const { RoomsChangePointsModel } = require('./change-points-model');
const { RoomsModel } = require('./model');
const { RoomsReturnPointsModel } = require('./return-points-model');

module.exports = {
    roomsChangePoints: RoomsChangePointsModel,
    rooms: RoomsModel,
    roomsReturnPoints: RoomsReturnPointsModel
};
