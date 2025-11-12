/**
 *
 * Reldens - Items System - ItemGroupModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class ItemGroupModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'items_group';
    }

    static get relationMappings()
    {
        const { ItemModel } = require('./item-model');
        return {
            parent_item: {
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

module.exports.ItemGroupModel = ItemGroupModel;
