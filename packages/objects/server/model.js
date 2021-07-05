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
        const { ObjectsAnimationsModel } = require('./animations-model');
        return {
            parent_room: {
                relation: ModelClass.HasOneRelation,
                modelClass: RoomsModel,
                join: {
                    from: this.tableName+'.room_id',
                    to: RoomsModel.tableName+'.id'
                }
            },
            objects_assets: {
                relation: ModelClass.HasManyRelation,
                modelClass: ObjectsAssetsModel,
                join: {
                    from: this.tableName+'.id',
                    to: ObjectsAssetsModel.tableName+'.object_id'
                }
            },
            objects_animations: {
                relation: ModelClass.HasManyRelation,
                modelClass: ObjectsAnimationsModel,
                join: {
                    from: this.tableName+'.id',
                    to: ObjectsAnimationsModel.tableName+'.object_id'
                }
            }
        }
    }

    static loadRoomObjects(roomId)
    {
        return this.query()
            .withGraphFetched('[parent_room, objects_assets, objects_animations]')
            .where('room_id', roomId)
            .orderBy('tile_index');
    }

}

module.exports.ObjectsModel = ObjectsModel;
