/**
 *
 * Reldens - ConfigModel
 *
 */

class ConfigModel
{

    constructor(id, scope, path, value, type)
    {
        this.id = id;
        this.scope = scope;
        this.path = path;
        this.value = value;
        this.type = type;
    }

    static get tableName()
    {
        return 'config';
    }
    

    static get relationTypes()
    {
        return {
            config_types: 'one'
        };
    }

    static get relationMappings()
    {
        return {
            'related_config_types': 'config_types'
        };
    }
}

module.exports.ConfigModel = ConfigModel;
