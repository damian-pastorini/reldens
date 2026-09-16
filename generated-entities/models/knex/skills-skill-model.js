/**
 *
 * Reldens - SkillsSkillModel
 *
 */

class SkillsSkillModel
{

    static get tableName()
    {
        return 'skills_skill';
    }

    static get relationMappings()
    {
        return {
            related_skills_skill_type: {
                relation: 'BelongsToOneRelation',
                tableName: 'skills_skill_type',
                from: 'type',
                to: 'id'
            },
            related_objects_skills: {
                relation: 'HasManyRelation',
                tableName: 'objects_skills',
                from: 'id',
                to: 'skill_id'
            },
            related_skills_class_path_level_skills: {
                relation: 'HasManyRelation',
                tableName: 'skills_class_path_level_skills',
                from: 'id',
                to: 'skill_id'
            },
            related_skills_skill_animations: {
                relation: 'HasManyRelation',
                tableName: 'skills_skill_animations',
                from: 'id',
                to: 'skill_id'
            },
            related_skills_skill_attack: {
                relation: 'HasOneRelation',
                tableName: 'skills_skill_attack',
                from: 'id',
                to: 'skill_id'
            },
            related_skills_skill_group_relation: {
                relation: 'HasOneRelation',
                tableName: 'skills_skill_group_relation',
                from: 'id',
                to: 'skill_id'
            },
            related_skills_skill_owner_conditions: {
                relation: 'HasManyRelation',
                tableName: 'skills_skill_owner_conditions',
                from: 'id',
                to: 'skill_id'
            },
            related_skills_skill_owner_effects: {
                relation: 'HasManyRelation',
                tableName: 'skills_skill_owner_effects',
                from: 'id',
                to: 'skill_id'
            },
            related_skills_skill_physical_data: {
                relation: 'HasOneRelation',
                tableName: 'skills_skill_physical_data',
                from: 'id',
                to: 'skill_id'
            },
            related_skills_skill_target_effects: {
                relation: 'HasManyRelation',
                tableName: 'skills_skill_target_effects',
                from: 'id',
                to: 'skill_id'
            }
        };
    }
}

module.exports.SkillsSkillModel = SkillsSkillModel;
