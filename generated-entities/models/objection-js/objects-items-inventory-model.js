/**
 *
 * Reldens - ObjectsItemsInventoryModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class ObjectsItemsInventoryModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'objects_items_inventory';
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
                    from: this.tableName+'.owner_id',
                    to: ObjectsModel.tableName+'.id'
                }
            },
            related_items_item: {
                relation: this.BelongsToOneRelation,
                modelClass: ItemsItemModel,
                join: {
                    from: this.tableName+'.item_id',
                    to: ItemsItemModel.tableName+'.id'
                }
            }
        };
    }
}

module.exports.ObjectsItemsInventoryModel = ObjectsItemsInventoryModel;
