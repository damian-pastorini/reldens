/**
 *
 * Reldens - RewardsModel
 *
 */

class RewardsModel
{

    static get tableName()
    {
        return 'rewards';
    }

    static get relationMappings()
    {
        return {
            related_objects: {
                relation: 'BelongsToOneRelation',
                tableName: 'objects',
                from: 'object_id',
                to: 'id'
            },
            related_items_item: {
                relation: 'BelongsToOneRelation',
                tableName: 'items_item',
                from: 'item_id',
                to: 'id'
            },
            related_rewards_modifiers: {
                relation: 'BelongsToOneRelation',
                tableName: 'rewards_modifiers',
                from: 'modifier_id',
                to: 'id'
            }
        };
    }
}

module.exports.RewardsModel = RewardsModel;
