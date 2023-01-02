/**
 *
 * Reldens - ObjectsModel
 *
 * Objects model, this class will load, add, edit, delete the values in the storage.
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class ObjectsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'objects';
    }

    static get relationMappings()
    {
        const { RoomsModel } = require('../../../../rooms/server/models/objection-js/rooms-model');
        const { ObjectsAssetsModel } = require('./assets-model');
        const { ObjectsAnimationsModel } = require('./animations-model');
        const { ObjectsStatsModel } = require('./objects-stats-model');
        return {
            parent_room: {
                relation: this.HasOneRelation,
                modelClass: RoomsModel,
                join: {
                    from: this.tableName+'.room_id',
                    to: RoomsModel.tableName+'.id'
                }
            },
            objects_assets: {
                relation: this.HasManyRelation,
                modelClass: ObjectsAssetsModel,
                join: {
                    from: this.tableName+'.id',
                    to: ObjectsAssetsModel.tableName+'.object_id'
                }
            },
            objects_animations: {
                relation: this.HasManyRelation,
                modelClass: ObjectsAnimationsModel,
                join: {
                    from: this.tableName+'.id',
                    to: ObjectsAnimationsModel.tableName+'.object_id'
                }
            },
            objects_stats: {
                relation: this.HasManyRelation,
                modelClass: ObjectsStatsModel,
                join: {
                    from: this.tableName+'.id',
                    to: ObjectsStatsModel.tableName+'.object_id'
                }
            }
        }
    }

}

module.exports.ObjectsModel = ObjectsModel;
