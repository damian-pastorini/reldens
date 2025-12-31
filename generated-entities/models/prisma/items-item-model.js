/**
 *
 * Reldens - ItemsItemModel
 *
 */

class ItemsItemModel
{

    constructor(id, key, type, group_id, label, description, qty_limit, uses_limit, useTimeOut, execTimeOut, customData, created_at, updated_at)
    {
        this.id = id;
        this.key = key;
        this.type = type;
        this.group_id = group_id;
        this.label = label;
        this.description = description;
        this.qty_limit = qty_limit;
        this.uses_limit = uses_limit;
        this.useTimeOut = useTimeOut;
        this.execTimeOut = execTimeOut;
        this.customData = customData;
        this.created_at = created_at;
        this.updated_at = updated_at;
    }

    static get tableName()
    {
        return 'items_item';
    }
    

    static get relationTypes()
    {
        return {
            drops_animations: 'one',
            items_inventory: 'many',
            items_group: 'one',
            items_types: 'one',
            items_item_modifiers: 'many',
            objects_items_inventory: 'many',
            objects_items_requirements_objects_items_requirements_item_keyToitems_item: 'many',
            objects_items_requirements_objects_items_requirements_required_item_keyToitems_item: 'many',
            objects_items_rewards_objects_items_rewards_item_keyToitems_item: 'many',
            objects_items_rewards_objects_items_rewards_reward_item_keyToitems_item: 'many',
            rewards: 'many'
        };
    }

    static get relationMappings()
    {
        return {
            'related_items_types': 'items_types',
            'related_items_group': 'items_group',
            'related_drops_animations': 'drops_animations',
            'related_items_inventory': 'items_inventory',
            'related_items_item_modifiers': 'items_item_modifiers',
            'related_objects_items_inventory': 'objects_items_inventory',
            'related_objects_items_requirements_item_key': 'objects_items_requirements_objects_items_requirements_item_keyToitems_item',
            'related_objects_items_requirements_required_item_key': 'objects_items_requirements_objects_items_requirements_required_item_keyToitems_item',
            'related_objects_items_rewards_item_key': 'objects_items_rewards_objects_items_rewards_item_keyToitems_item',
            'related_objects_items_rewards_reward_item_key': 'objects_items_rewards_objects_items_rewards_reward_item_keyToitems_item',
            'related_rewards': 'rewards'
        };
    }
}

module.exports.ItemsItemModel = ItemsItemModel;
