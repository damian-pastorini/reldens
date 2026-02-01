/**
 *
 * Reldens - FeaturesModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class FeaturesModel
{

    constructor(id, code, title, is_enabled)
    {
        this.id = id;
        this.code = code;
        this.title = title;
        this.is_enabled = is_enabled;
    }

    static createByProps(props)
    {
        const {id, code, title, is_enabled} = props;
        return new this(id, code, title, is_enabled);
    }
    
}

const schema = new EntitySchema({
    class: FeaturesModel,
    tableName: 'features',
    properties: {
        id: { type: 'number', primary: true },
        code: { type: 'string' },
        title: { type: 'string' },
        is_enabled: { type: 'number', nullable: true }
    },
});

module.exports = {
    FeaturesModel,
    entity: FeaturesModel,
    schema: schema
};
