/**
 *
 * Reldens - OperationTypesModel
 *
 */

class OperationTypesModel
{

    constructor(id, label, key)
    {
        this.id = id;
        this.label = label;
        this.key = key;
    }

    static get tableName()
    {
        return 'operation_types';
    }
    

    static get relationTypes()
    {
        return {
            clan_levels_modifiers: 'many',
            items_item_modifiers: 'many',
            rewards_modifiers: 'many',
            skills_levels_modifiers: 'many',
            skills_skill_owner_effects: 'many',
            skills_skill_target_effects: 'many'
        };
    }

    static get relationMappings()
    {
        return {
            'related_clan_levels_modifiers': 'clan_levels_modifiers',
            'related_items_item_modifiers': 'items_item_modifiers',
            'related_rewards_modifiers': 'rewards_modifiers',
            'related_skills_levels_modifiers': 'skills_levels_modifiers',
            'related_skills_skill_owner_effects': 'skills_skill_owner_effects',
            'related_skills_skill_target_effects': 'skills_skill_target_effects'
        };
    }
}

module.exports.OperationTypesModel = OperationTypesModel;
