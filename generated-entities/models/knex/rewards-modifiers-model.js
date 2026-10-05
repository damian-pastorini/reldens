/**
 *
 * Reldens - RewardsModifiersModel
 *
 */

class RewardsModifiersModel
{

    static get tableName()
    {
        return 'rewards_modifiers';
    }

    static get relationMappings()
    {
        return {
            related_operation_types: {
                relation: 'BelongsToOneRelation',
                tableName: 'operation_types',
                from: 'operation',
                to: 'id'
            },
            related_rewards: {
                relation: 'HasManyRelation',
                tableName: 'rewards',
                from: 'id',
                to: 'modifier_id'
            }
        };
    }
}

module.exports.RewardsModifiersModel = RewardsModifiersModel;
