/**
 *
 * Reldens - TargetOptionsModel
 *
 */

class TargetOptionsModel
{

    static get tableName()
    {
        return 'target_options';
    }

    static get relationMappings()
    {
        return {
            related_objects_skills: {
                relation: 'HasManyRelation',
                tableName: 'objects_skills',
                from: 'id',
                to: 'target_id'
            }
        };
    }
}

module.exports.TargetOptionsModel = TargetOptionsModel;
