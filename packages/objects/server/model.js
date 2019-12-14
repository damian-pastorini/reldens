/**
 *
 * Reldens - ObjectsModel
 *
 * Objects model, this class will load, add, edit, delete the values in the storage.
 *
 */

const { Model } = require('objection');
const { RoomsModel } = require('../../rooms/server/model');
const { ObjectsAssetsModel } = require('./assets-model');

class ObjectsModel extends Model
{

    static get tableName()
    {
        return 'objects';
    }

    static get relationMappings()
    {
        return {
            parent_room: {
                relation: Model.HasOneRelation,
                modelClass: RoomsModel,
                join: {
                    from: 'objects.room_id',
                    to: 'rooms.id'
                }
            },
            objects_assets: {
                relation: Model.HasManyRelation,
                modelClass: ObjectsAssetsModel,
                join: {
                    from: 'objects.id',
                    to: 'objects_assets.object_id'
                }
            }
        }
    }

}

module.exports.ObjectsModel = ObjectsModel;
