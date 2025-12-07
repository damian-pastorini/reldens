/**
 *
 * Reldens - RewardsModel
 *
 */

class RewardsModel
{

    constructor(id, object_id, item_id, modifier_id, experience, drop_rate, drop_quantity, is_unique, was_given, has_drop_body, created_at, updated_at)
    {
        this.id = id;
        this.object_id = object_id;
        this.item_id = item_id;
        this.modifier_id = modifier_id;
        this.experience = experience;
        this.drop_rate = drop_rate;
        this.drop_quantity = drop_quantity;
        this.is_unique = is_unique;
        this.was_given = was_given;
        this.has_drop_body = has_drop_body;
        this.created_at = created_at;
        this.updated_at = updated_at;
    }

    static get tableName()
    {
        return 'rewards';
    }
    

    static get relationTypes()
    {
        return {
            items_item: 'one',
            objects: 'one',
            rewards_modifiers: 'one'
        };
    }

    static get relationMappings()
    {
        return {
            'related_objects': 'objects',
            'related_items_item': 'items_item',
            'related_rewards_modifiers': 'rewards_modifiers'
        };
    }
}

module.exports.RewardsModel = RewardsModel;
