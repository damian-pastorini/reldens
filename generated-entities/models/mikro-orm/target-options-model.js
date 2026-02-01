/**
 *
 * Reldens - TargetOptionsModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class TargetOptionsModel
{

    constructor(id, target_key, target_label)
    {
        this.id = id;
        this.target_key = target_key;
        this.target_label = target_label;
    }

    static createByProps(props)
    {
        const {id, target_key, target_label} = props;
        return new this(id, target_key, target_label);
    }
    
}

const schema = new EntitySchema({
    class: TargetOptionsModel,
    tableName: 'target_options',
    properties: {
        id: { type: 'number', primary: true },
        target_key: { type: 'string' },
        target_label: { type: 'string', nullable: true },
        related_objects_skills: {
            kind: '1:m',
            entity: 'ObjectsSkillsModel',
            mappedBy: 'related_target_options'
        }
    },
});

module.exports = {
    TargetOptionsModel,
    entity: TargetOptionsModel,
    schema: schema
};
