/**
 *
 * Reldens - ObjectsInventoryModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class ObjectsInventoryModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'objects_items_inventory';
    }

    static get relationMappings()
    {
        const { ItemModel } = require('@reldens/items-system/lib/server/storage/models/objection-js/item-model');
        return {
            items_item: {
                relation: this.HasOneRelation,
                modelClass: ItemModel,
                join: {
                    from: this.tableName+'.item_id',
                    to: ItemModel.tableName+'.id'
                }
            }
        };
    }

}

module.exports.ObjectsInventoryModel = ObjectsInventoryModel;
