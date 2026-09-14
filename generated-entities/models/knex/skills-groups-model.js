/**
 *
 * Reldens - SkillsGroupsModel
 *
 */

class SkillsGroupsModel
{

    static get tableName()
    {
        return 'skills_groups';
    }

    static get relationMappings()
    {
        return {
            related_skills_skill_group_relation: {
                relation: 'HasManyRelation',
                tableName: 'skills_skill_group_relation',
                from: 'id',
                to: 'group_id'
            }
        };
    }
}

module.exports.SkillsGroupsModel = SkillsGroupsModel;
