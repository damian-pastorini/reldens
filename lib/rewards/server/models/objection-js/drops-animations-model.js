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
        const { ItemModel } = require('@reldens/items-system/lib/server/storage/models/objection-js/item-model');
        return {
            parent_item: {
                relation: this.HasOneRelation,
                modelClass: ItemModel,
                join: {
                    from: this.tableName + '.item_id',
                    to: ItemModel.tableName + '.id'
                }
            }
        };
    }

}

module.exports.DropsAnimationsModel = DropsAnimationsModel;
