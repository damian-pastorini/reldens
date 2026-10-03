/**
 *
 * Reldens - OperationTypesModel
 *
 */

class OperationTypesModel
{

    static get tableName()
    {
        return 'operation_types';
    }

    static get relationMappings()
    {
        return {
            related_clan_levels_modifiers: {
                relation: 'HasManyRelation',
                tableName: 'clan_levels_modifiers',
                from: 'key',
                to: 'operation'
            },
            related_items_item_modifiers: {
                relation: 'HasManyRelation',
                tableName: 'items_item_modifiers',
                from: 'id',
                to: 'operation'
            },
            related_rewards_modifiers: {
                relation: 'HasManyRelation',
                tableName: 'rewards_modifiers',
                from: 'id',
                to: 'operation'
            },
            related_skills_levels_modifiers: {
                relation: 'HasManyRelation',
                tableName: 'skills_levels_modifiers',
                from: 'key',
                to: 'operation'
            },
            related_skills_skill_owner_effects: {
                relation: 'HasManyRelation',
                tableName: 'skills_skill_owner_effects',
                from: 'key',
                to: 'operation'
            },
            related_skills_skill_target_effects: {
                relation: 'HasManyRelation',
                tableName: 'skills_skill_target_effects',
                from: 'key',
                to: 'operation'
            }
        };
    }
}

module.exports.OperationTypesModel = OperationTypesModel;
