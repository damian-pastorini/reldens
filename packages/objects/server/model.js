/**
 *
 * Reldens - ObjectsModel
 *
 * Objects model, this class will load, add, edit, delete the values in the storage.
 *
 */

const { ModelClass } = require('@reldens/storage');

class ObjectsModel extends ModelClass
{

    static get tableName()
    {
        return 'objects';
    }

    static get relationMappings()
    {
        const { RoomsModel } = require('../../rooms/server/model');
        const { ObjectsAssetsModel } = require('./assets-model');
        return {
            parent_room: {
                relation: ModelClass.HasOneRelation,
                modelClass: RoomsModel,
                join: {
                    from: 'objects.room_id',
                    to: 'rooms.id'
                }
            },
            objects_assets: {
                relation: ModelClass.HasManyRelation,
                modelClass: ObjectsAssetsModel,
                join: {
                    from: 'objects.id',
                    to: 'objects_assets.object_id'
                }
            }
        }
    }

    static loadRoomObjects(roomId)
    {
        return this.query()
            .withGraphFetched('[parent_room, objects_assets]')
            .where('room_id', roomId)
            .orderBy('tile_index');
    }

}

module.exports.ObjectsModel = ObjectsModel;
