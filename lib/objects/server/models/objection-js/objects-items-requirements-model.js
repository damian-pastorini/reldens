/**
 *
 * Reldens - ObjectsInventoryModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');
const {ObjectsModel} = require("./objects-model");

class ObjectsItemsRequirementsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'objects_items_requirements';
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

module.exports.ObjectsItemsRequirementsModel = ObjectsItemsRequirementsModel;
