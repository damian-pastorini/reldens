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
        const { OperationTypesModel } = require('./operation-types-model');
        const { RewardsModel } = require('./rewards-model');
        return {
            related_operation_types: {
                relation: this.BelongsToOneRelation,
                modelClass: OperationTypesModel,
                join: {
                    from: this.tableName+'.operation',
                    to: OperationTypesModel.tableName+'.id'
                }
            },
            related_rewards: {
                relation: this.HasManyRelation,
                modelClass: RewardsModel,
                join: {
                    from: this.tableName+'.id',
                    to: RewardsModel.tableName+'.modifier_id'
                }
            }
        };
    }
}

module.exports.RewardsModifiersModel = RewardsModifiersModel;
