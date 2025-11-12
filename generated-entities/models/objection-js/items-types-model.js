/**
 *
 * Reldens - ItemsTypesModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class ItemsTypesModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'items_types';
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
                    to: ItemsItemModel.tableName+'.type'
                }
            }
        };
    }
}

module.exports.ItemsTypesModel = ItemsTypesModel;
