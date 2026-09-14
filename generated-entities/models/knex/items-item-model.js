/**
 *
 * Reldens - ItemsItemModel
 *
 */

class ItemsItemModel
{

    static get tableName()
    {
        return 'items_item';
    }

    static get relationMappings()
    {
        return {
            related_items_types: {
                relation: 'BelongsToOneRelation',
                tableName: 'items_types',
                from: 'type',
                to: 'id'
            },
            related_items_group: {
                relation: 'BelongsToOneRelation',
                tableName: 'items_group',
                from: 'group_id',
                to: 'id'
            },
            related_drops_animations: {
                relation: 'HasOneRelation',
                tableName: 'drops_animations',
                from: 'id',
                to: 'item_id'
            },
            related_items_inventory: {
                relation: 'HasManyRelation',
                tableName: 'items_inventory',
                from: 'id',
                to: 'item_id'
            },
            related_items_item_modifiers: {
                relation: 'HasManyRelation',
                tableName: 'items_item_modifiers',
                from: 'id',
                to: 'item_id'
            },
            related_objects_items_inventory: {
                relation: 'HasManyRelation',
                tableName: 'objects_items_inventory',
                from: 'id',
                to: 'item_id'
            },
            related_objects_items_requirements_item_key: {
                relation: 'HasManyRelation',
                tableName: 'objects_items_requirements',
                from: 'key',
                to: 'item_key'
            },
            related_objects_items_requirements_required_item_key: {
                relation: 'HasManyRelation',
                tableName: 'objects_items_requirements',
                from: 'key',
                to: 'required_item_key'
            },
            related_objects_items_rewards_item_key: {
                relation: 'HasManyRelation',
                tableName: 'objects_items_rewards',
                from: 'key',
                to: 'item_key'
            },
            related_objects_items_rewards_reward_item_key: {
                relation: 'HasManyRelation',
                tableName: 'objects_items_rewards',
                from: 'key',
                to: 'reward_item_key'
            },
            related_rewards: {
                relation: 'HasManyRelation',
                tableName: 'rewards',
                from: 'id',
                to: 'item_id'
            }
        };
    }
}

module.exports.ItemsItemModel = ItemsItemModel;
