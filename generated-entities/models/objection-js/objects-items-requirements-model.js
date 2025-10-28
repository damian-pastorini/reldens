/**
 *
 * Reldens - ObjectsItemsRequirementsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class ObjectsItemsRequirementsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'objects_items_requirements';
    }
    

    static get relationMappings()
    {
        const { ObjectsModel } = require('./objects-model');
        const { ItemsItemModel } = require('./items-item-model');
        return {
            related_objects: {
                relation: this.BelongsToOneRelation,
                modelClass: ObjectsModel,
                join: {
                    from: this.tableName+'.object_id',
                    to: ObjectsModel.tableName+'.id'
                }
            },
            related_items_item: {
                relation: this.BelongsToOneRelation,
                modelClass: ItemsItemModel,
                join: {
                    from: this.tableName+'.required_item_key',
                    to: ItemsItemModel.tableName+'.key'
                }
            }
        };
    }
}

module.exports.ObjectsItemsRequirementsModel = ObjectsItemsRequirementsModel;
