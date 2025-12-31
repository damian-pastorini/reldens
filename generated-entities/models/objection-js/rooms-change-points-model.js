/**
 *
 * Reldens - RoomsChangePointsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class RoomsChangePointsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'rooms_change_points';
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
            related_rooms_next_room: {
                relation: this.BelongsToOneRelation,
                modelClass: RoomsModel,
                join: {
                    from: this.tableName+'.next_room_id',
                    to: RoomsModel.tableName+'.id'
                }
            }
        };
    }
}

module.exports.RoomsChangePointsModel = RoomsChangePointsModel;
