/**
 *
 * Reldens - Items System - Item
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class ItemModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'items_item';
    }

    static get relationMappings()
    {
        const { InventoryModel } = require('./inventory-model');
        const { ItemGroupModel } = require('./item-group-model');
        const { ItemModifiersModel } = require('./item-modifiers-model');
        return {
            items_inventory: {
                relation: this.BelongsToOneRelation,
                modelClass: InventoryModel,
                join: {
                    from: this.tableName+'.id',
                    to: InventoryModel.tableName+'.item_id'
                }
            },
            items_group_id: {
                relation: this.HasOneRelation,
                modelClass: ItemGroupModel,
                join: {
                    from: this.tableName+'.group_id',
                    to: ItemGroupModel.tableName+'.id'
                }
            },
            items_modifiers: {
                relation: this.HasManyRelation,
                modelClass: ItemModifiersModel,
                join: {
                    from: this.tableName+'.id',
                    to: ItemModifiersModel.tableName+'.item_id'
                }
            }
        };
    }

}

module.exports.ItemModel = ItemModel;
