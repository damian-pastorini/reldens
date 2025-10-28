/**
 *
 * Reldens - ItemsItemModifiersModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class ItemsItemModifiersModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'items_item_modifiers';
    }
    

    static get relationMappings()
    {
        const { ItemsItemModel } = require('./items-item-model');
        const { OperationTypesModel } = require('./operation-types-model');
        return {
            related_items_item: {
                relation: this.BelongsToOneRelation,
                modelClass: ItemsItemModel,
                join: {
                    from: this.tableName+'.item_id',
                    to: ItemsItemModel.tableName+'.id'
                }
            },
            related_operation_types: {
                relation: this.BelongsToOneRelation,
                modelClass: OperationTypesModel,
                join: {
                    from: this.tableName+'.operation',
                    to: OperationTypesModel.tableName+'.id'
                }
            }
        };
    }
}

module.exports.ItemsItemModifiersModel = ItemsItemModifiersModel;
