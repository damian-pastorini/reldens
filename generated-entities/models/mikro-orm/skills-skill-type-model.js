/**
 *
 * Reldens - SkillsSkillTypeModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class SkillsSkillTypeModel
{

    constructor(id, key)
    {
        this.id = id;
        this.key = key;
    }

    static createByProps(props)
    {
        const {id, key} = props;
        return new this(id, key);
    }
    
}

const schema = new EntitySchema({
    class: SkillsSkillTypeModel,
    tableName: 'skills_skill_type',
    properties: {
        id: { type: 'number', primary: true },
        key: { type: 'string' },
        related_skills_skill: {
            kind: '1:m',
            entity: 'SkillsSkillModel',
            mappedBy: 'related_skills_skill_type'
        }
    },
});

module.exports = {
    SkillsSkillTypeModel,
    entity: SkillsSkillTypeModel,
    schema: schema
};
