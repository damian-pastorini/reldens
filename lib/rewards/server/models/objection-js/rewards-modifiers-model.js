/**
 *
 * Reldens - RewardsModifiersModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class RewardsModifiersModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'rewards_modifiers';
    }

    static get relationMappings()
    {
        const { RewardsModel } = require('./rewards-model');

        return {
            // reward: {
            //     relation: this.BelongsToOneRelation,
            //     modelClass: RewardsModel,
            //     join: {
            //         from: this.tableName + '.id',
            //         to: RewardsModel.tableName + '.modifier_id'
            //     }
            // }
        };
    }
}

module.exports.RewardsModifiersModel = RewardsModifiersModel;
