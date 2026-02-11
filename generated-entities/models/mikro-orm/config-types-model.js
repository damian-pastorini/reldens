/**
 *
 * Reldens - ConfigTypesModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class ConfigTypesModel
{

    constructor(id, label)
    {
        this.id = id;
        this.label = label;
    }

    static createByProps(props)
    {
        const {id, label} = props;
        return new this(id, label);
    }
    
}

const schema = new EntitySchema({
    class: ConfigTypesModel,
    tableName: 'config_types',
    properties: {
        id: { type: 'number', primary: true },
        label: { type: 'string' },
        related_config: {
            kind: '1:m',
            entity: 'ConfigModel',
            mappedBy: 'related_config_types'
        }
    },
});

module.exports = {
    ConfigTypesModel,
    entity: ConfigTypesModel,
    schema: schema
};
