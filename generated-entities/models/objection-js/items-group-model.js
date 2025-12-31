/**
 *
 * Reldens - ItemsGroupModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class ItemsGroupModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'items_group';
    }

    static get relationMappings()
    {
        const { ItemsItemModel } = require('./items-item-model');
        return {
            related_items_item: {
                relation: this.HasManyRelation,
                modelClass: ItemsItemModel,
                join: {
                    from: this.tableName+'.id',
                    to: ItemsItemModel.tableName+'.group_id'
                }
            }
        };
    }
}

module.exports.ItemsGroupModel = ItemsGroupModel;
