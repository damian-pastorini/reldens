/**
 *
 * Reldens - RoomsReturnPointsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class RoomsReturnPointsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'rooms_return_points';
    }
    
    static get relationMappings()
    {
        const { RoomsModel } = require('./rooms-model');
        return {
            related_rooms_room: {
                relation: this.BelongsToOneRelation,
                modelClass: RoomsModel,
                join: {
                    from: this.tableName+'.room_id',
                    to: RoomsModel.tableName+'.id'
                }
            },
            related_rooms_from_room: {
                relation: this.BelongsToOneRelation,
                modelClass: RoomsModel,
                join: {
                    from: this.tableName+'.from_room_id',
                    to: RoomsModel.tableName+'.id'
                }
            }
        };
    }
}

module.exports.RoomsReturnPointsModel = RoomsReturnPointsModel;
