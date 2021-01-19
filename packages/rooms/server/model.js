/**
 *
 * Reldens - RoomsModel
 *
 * Rooms storage model, this class will load, add, edit, delete the values in the storage.
 *
 */

const { ModelClass } = require('@reldens/storage');

class RoomsModel extends ModelClass
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
                relation: ModelClass.HasManyRelation,
                modelClass: RoomsChangePointsModel,
                join: {
                    from: 'rooms.id',
                    to: 'rooms_change_points.room_id'
                }
            },
            rooms_return_points: {
                relation: ModelClass.HasManyRelation,
                modelClass: RoomsReturnPointsModel,
                join: {
                    from: 'rooms.id',
                    to: 'rooms_return_points.room_id'
                }
            },
            next_room: {
                relation: ModelClass.BelongsToOneRelation,
                modelClass: RoomsChangePointsModel,
                join: {
                    from: 'rooms.id',
                    to: 'rooms_change_points.next_room_id'
                }
            },
            to_room: {
                relation: ModelClass.BelongsToOneRelation,
                modelClass: RoomsReturnPointsModel,
                join: {
                    from: 'rooms.id',
                    to: 'rooms_change_points.next_room_id'
                }
            }
        };
    }

    static loadFullData()
    {
        return this.query()
            .withGraphFetched('[rooms_change_points.next_room, rooms_return_points.to_room]');
    }

    static loadById(roomId)
    {
        return this.query()
            .withGraphFetched('[rooms_change_points.next_room, rooms_return_points.to_room]')
            .findById(roomId);
    }

    static loadByName(name)
    {
        return this.query()
            .withGraphFetched('[rooms_change_points.next_room, rooms_return_points.to_room]')
            .where('name', name)
            .first();
    }

}

module.exports.RoomsModel = RoomsModel;
