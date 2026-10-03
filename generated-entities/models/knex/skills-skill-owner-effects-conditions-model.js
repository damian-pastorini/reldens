/**
 *
 * Reldens - SkillsSkillOwnerEffectsConditionsModel
 *
 */

class SkillsSkillOwnerEffectsConditionsModel
{

    static get tableName()
    {
        return 'skills_skill_owner_effects_conditions';
    }

    static get relationMappings()
    {
        return {
            related_skills_skill_owner_effects: {
                relation: 'BelongsToOneRelation',
                tableName: 'skills_skill_owner_effects',
                from: 'skill_owner_effect_id',
                to: 'id'
            }
        };
    }
}

module.exports.SkillsSkillOwnerEffectsConditionsModel = SkillsSkillOwnerEffectsConditionsModel;
