/**
 *
 * Reldens - RoomsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class RoomsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'rooms';
    }

    static get relationMappings()
    {
        const { RoomsChangePointsModel } = require('./change-points-model');
        const { RoomsReturnPointsModel } = require('./return-points-model');
        return {
            rooms_change_points: {
                relation: this.HasManyRelation,
                modelClass: RoomsChangePointsModel,
                join: {
                    from: 'rooms.id',
                    to: RoomsChangePointsModel.tableName+'.room_id'
                }
            },
            rooms_return_points: {
                relation: this.HasManyRelation,
                modelClass: RoomsReturnPointsModel,
                join: {
                    from: this.tableName+'.id',
                    to: RoomsReturnPointsModel.tableName+'.room_id'
                }
            },
            next_room: {
                relation: this.BelongsToOneRelation,
                modelClass: RoomsChangePointsModel,
                join: {
                    from: this.tableName+'.id',
                    to: RoomsChangePointsModel.tableName+'.next_room_id'
                }
            },
            from_room: {
                relation: this.BelongsToOneRelation,
                modelClass: RoomsReturnPointsModel,
                join: {
                    from: this.tableName+'.id',
                    to: RoomsReturnPointsModel.tableName+'.next_room_id'
                }
            }
        };
    }

}

module.exports.RoomsModel = RoomsModel;
