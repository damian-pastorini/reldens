/**
 *
 * Reldens - SkillsGroupsModel
 *
 */

class SkillsGroupsModel
{

    constructor(id, key, label, description, sort)
    {
        this.id = id;
        this.key = key;
        this.label = label;
        this.description = description;
        this.sort = sort;
    }

    static get tableName()
    {
        return 'skills_groups';
    }
    

    static get relationTypes()
    {
        return {
            skills_skill_group_relation: 'many'
        };
    }

    static get relationMappings()
    {
        return {
            'related_skills_skill_group_relation': 'skills_skill_group_relation'
        };
    }
}

module.exports.SkillsGroupsModel = SkillsGroupsModel;
