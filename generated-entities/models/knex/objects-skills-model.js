/**
 *
 * Reldens - ObjectsSkillsModel
 *
 */

class ObjectsSkillsModel
{

    static get tableName()
    {
        return 'objects_skills';
    }

    static get relationMappings()
    {
        return {
            related_objects: {
                relation: 'BelongsToOneRelation',
                tableName: 'objects',
                from: 'object_id',
                to: 'id'
            },
            related_skills_skill: {
                relation: 'BelongsToOneRelation',
                tableName: 'skills_skill',
                from: 'skill_id',
                to: 'id'
            },
            related_target_options: {
                relation: 'BelongsToOneRelation',
                tableName: 'target_options',
                from: 'target_id',
                to: 'id'
            }
        };
    }
}

module.exports.ObjectsSkillsModel = ObjectsSkillsModel;
