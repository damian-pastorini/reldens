/**
 *
 * Reldens - TargetOptionsModel
 *
 */

class TargetOptionsModel
{

    constructor(id, target_key, target_label)
    {
        this.id = id;
        this.target_key = target_key;
        this.target_label = target_label;
    }

    static get tableName()
    {
        return 'target_options';
    }
    

    static get relationTypes()
    {
        return {
            objects_skills: 'many'
        };
    }

    static get relationMappings()
    {
        return {
            'related_objects_skills': 'objects_skills'
        };
    }
}

module.exports.TargetOptionsModel = TargetOptionsModel;
