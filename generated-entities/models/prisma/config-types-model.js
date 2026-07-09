/**
 *
 * Reldens - ConfigTypesModel
 *
 */

class ConfigTypesModel
{

    constructor(id, label)
    {
        this.id = id;
        this.label = label;
    }

    static get tableName()
    {
        return 'config_types';
    }


    static get relationTypes()
    {
        return {
            config: 'one'
        };
    }

    static get relationMappings()
    {
        return {
            'related_config': 'config'
        };
    }
}

module.exports.ConfigTypesModel = ConfigTypesModel;
