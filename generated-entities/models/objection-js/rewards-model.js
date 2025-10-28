/**
 *
 * Reldens - RewardsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class RewardsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'rewards';
    }
    

    static get relationMappings()
    {
        const { ObjectsModel } = require('./objects-model');
        const { ItemsItemModel } = require('./items-item-model');
        const { RewardsModifiersModel } = require('./rewards-modifiers-model');
        return {
            related_objects: {
                relation: this.BelongsToOneRelation,
                modelClass: ObjectsModel,
                join: {
                    from: this.tableName+'.object_id',
                    to: ObjectsModel.tableName+'.id'
                }
            },
            related_items_item: {
                relation: this.BelongsToOneRelation,
                modelClass: ItemsItemModel,
                join: {
                    from: this.tableName+'.item_id',
                    to: ItemsItemModel.tableName+'.id'
                }
            },
            related_rewards_modifiers: {
                relation: this.BelongsToOneRelation,
                modelClass: RewardsModifiersModel,
                join: {
                    from: this.tableName+'.modifier_id',
                    to: RewardsModifiersModel.tableName+'.id'
                }
            }
        };
    }
}

module.exports.RewardsModel = RewardsModel;
