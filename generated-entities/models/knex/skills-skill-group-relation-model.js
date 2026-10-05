/**
 *
 * Reldens - SkillsSkillGroupRelationModel
 *
 */

class SkillsSkillGroupRelationModel
{

    static get tableName()
    {
        return 'skills_skill_group_relation';
    }

    static get relationMappings()
    {
        return {
            related_skills_skill: {
                relation: 'BelongsToOneRelation',
                tableName: 'skills_skill',
                from: 'skill_id',
                to: 'id'
            },
            related_skills_groups: {
                relation: 'BelongsToOneRelation',
                tableName: 'skills_groups',
                from: 'group_id',
                to: 'id'
            }
        };
    }
}

module.exports.SkillsSkillGroupRelationModel = SkillsSkillGroupRelationModel;
