/**
 *
 * Reldens - ObjectsSkillsModel
 *
 */

class ObjectsSkillsModel
{

    constructor(id, object_id, skill_id, target_id)
    {
        this.id = id;
        this.object_id = object_id;
        this.skill_id = skill_id;
        this.target_id = target_id;
    }

    static get tableName()
    {
        return 'objects_skills';
    }
    

    static get relationTypes()
    {
        return {
            objects: 'one',
            skills_skill: 'one',
            target_options: 'one'
        };
    }

    static get relationMappings()
    {
        return {
            'related_objects': 'objects',
            'related_skills_skill': 'skills_skill',
            'related_target_options': 'target_options'
        };
    }
}

module.exports.ObjectsSkillsModel = ObjectsSkillsModel;
