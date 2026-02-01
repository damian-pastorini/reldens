/**
 *
 * Reldens - ConfigModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

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

    static createByProps(props)
    {
        const {id, scope, path, value, type} = props;
        return new this(id, scope, path, value, type);
    }
    
}

const schema = new EntitySchema({
    class: ConfigModel,
    tableName: 'config',
    properties: {
        id: { type: 'number', primary: true },
        scope: { type: 'string' },
        path: { type: 'string' },
        value: { type: 'string' },
        type: { type: 'number', persist: false },
        related_config_types: {
            kind: 'm:1',
            entity: 'ConfigTypesModel',
            joinColumn: 'type'
        }
    },
});
schema._fkMappings = {
    "type": {
        "relationKey": "related_config_types",
        "entityName": "ConfigTypesModel",
        "referencedColumn": "id",
        "nullable": false
    }
};
module.exports = {
    ConfigModel,
    entity: ConfigModel,
    schema: schema
};
