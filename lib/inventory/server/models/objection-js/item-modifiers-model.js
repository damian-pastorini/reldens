/**
 *
 * Reldens - Items System - Modifiers
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class ItemModifiersModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'items_item_modifiers';
    }

    static get relationMappings()
    {
        const { ItemModel } = require('./item-model');
        return {
            items_item_id: {
                relation: this.BelongsToOneRelation,
                modelClass: ItemModel,
                join: {
                    from: this.tableName+'.item_id',
                    to: ItemModel.tableName+'.id'
                }
            }
        };
    }

}

module.exports.ItemModifiersModel = ItemModifiersModel;
