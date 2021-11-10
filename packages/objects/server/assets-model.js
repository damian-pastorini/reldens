/**
 *
 * Reldens - ObjectsAssetsModel
 *
 */

const { ModelClassDeprecated } = require('@reldens/storage');
const { ObjectsModel } = require('./model');

class ObjectsAssetsModel extends ModelClassDeprecated
{

    static get tableName()
    {
        return 'objects_assets';
    }

    static get idColumn()
    {
        return 'object_asset_id';
    }

    static get relationMappings()
    {
        return {
            parent_object: {
                relation: ModelClassDeprecated.BelongsToOneRelation,
                modelClass: ObjectsModel,
                join: {
                    from: this.tableName+'.object_id',
                    to: ObjectsModel.tableName+'.id'
                }
            }
        }
    }

}

module.exports.ObjectsAssetsModel = ObjectsAssetsModel;
