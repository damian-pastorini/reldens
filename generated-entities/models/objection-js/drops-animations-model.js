/**
 *
 * Reldens - DropsAnimationsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class DropsAnimationsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'drops_animations';
    }

    static get relationMappings()
    {
        const { ItemsItemModel } = require('./items-item-model');
        return {
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

module.exports.DropsAnimationsModel = DropsAnimationsModel;
