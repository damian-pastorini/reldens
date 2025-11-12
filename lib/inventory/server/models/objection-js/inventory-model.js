/**
 *
 * Reldens - Items System - InventoryModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class InventoryModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'items_inventory';
    }

    static get relationMappings()
    {
        const { ItemModel } = require('./item-model');
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

module.exports.InventoryModel = InventoryModel;
