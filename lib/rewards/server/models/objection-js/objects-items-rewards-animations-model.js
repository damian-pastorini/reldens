/**
 *
 * Reldens - RewardsModifiersModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class ObjectsItemsRewardsAnimationsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'objects_items_rewards_animations';
    }

    static get relationMappings()
    {
        const { RewardsModel } = require('./rewards-model');

        return {
            reward: {
                relation: this.BelongsToOneRelation,
                modelClass: RewardsModel,
                join: {
                    from: this.tableName + '.reward_id',
                    to: RewardsModel.tableName + '.id'
                }
            }
        };
    }
}

module.exports.ObjectsItemsRewardsAnimationsModel = ObjectsItemsRewardsAnimationsModel;
