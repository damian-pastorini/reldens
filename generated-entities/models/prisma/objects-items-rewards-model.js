/**
 *
 * Reldens - ObjectsItemsRewardsModel
 *
 */

class ObjectsItemsRewardsModel
{

    constructor(id, object_id, item_key, reward_item_key, reward_quantity, reward_item_is_required)
    {
        this.id = id;
        this.object_id = object_id;
        this.item_key = item_key;
        this.reward_item_key = reward_item_key;
        this.reward_quantity = reward_quantity;
        this.reward_item_is_required = reward_item_is_required;
    }

    static get tableName()
    {
        return 'objects_items_rewards';
    }
    

    static get relationTypes()
    {
        return {
            items_item_objects_items_rewards_item_keyToitems_item: 'one',
            items_item_objects_items_rewards_reward_item_keyToitems_item: 'one',
            objects: 'one'
        };
    }

    static get relationMappings()
    {
        return {
            'related_objects': 'objects',
            'related_items_item_item_key': 'items_item_objects_items_rewards_item_keyToitems_item',
            'related_items_item_reward_item_key': 'items_item_objects_items_rewards_reward_item_keyToitems_item'
        };
    }
}

module.exports.ObjectsItemsRewardsModel = ObjectsItemsRewardsModel;
