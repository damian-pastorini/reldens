/**
 *
 * Reldens - ItemsInventoryModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class ItemsInventoryModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'items_inventory';
    }
    
    static get relationMappings()
    {
        const { PlayersModel } = require('./players-model');
        const { ItemsItemModel } = require('./items-item-model');
        return {
            related_players: {
                relation: this.BelongsToOneRelation,
                modelClass: PlayersModel,
                join: {
                    from: this.tableName+'.owner_id',
                    to: PlayersModel.tableName+'.id'
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

module.exports.ItemsInventoryModel = ItemsInventoryModel;
