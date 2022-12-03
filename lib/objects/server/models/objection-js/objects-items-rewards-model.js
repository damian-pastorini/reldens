/**
 *
 * Reldens - ObjectsItemsRewardsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class ObjectsItemsRewardsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'objects_items_rewards';
    }

    static get relationMappings()
    {
        const { ObjectsModel } = require('./objects-model');
        return {
            object_owner: {
                relation: this.HasOneRelation,
                modelClass: ObjectsModel,
                join: {
                    from: this.tableName+'.object_id',
                    to: ObjectsModel.tableName+'.id'
                }
            }
        };
    }

}

module.exports.ObjectsItemsRewardsModel = ObjectsItemsRewardsModel;
