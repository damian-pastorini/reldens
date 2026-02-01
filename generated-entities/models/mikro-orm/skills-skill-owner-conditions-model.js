/**
 *
 * Reldens - SkillsSkillOwnerConditionsModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class SkillsSkillOwnerConditionsModel
{

    constructor(id, skill_id, key, property_key, conditional, value)
    {
        this.id = id;
        this.skill_id = skill_id;
        this.key = key;
        this.property_key = property_key;
        this.conditional = conditional;
        this.value = value;
    }

    static createByProps(props)
    {
        const {id, skill_id, key, property_key, conditional, value} = props;
        return new this(id, skill_id, key, property_key, conditional, value);
    }
    
}

const schema = new EntitySchema({
    class: SkillsSkillOwnerConditionsModel,
    tableName: 'skills_skill_owner_conditions',
    properties: {
        id: { type: 'number', primary: true },
        skill_id: { type: 'number', persist: false },
        key: { type: 'string' },
        property_key: { type: 'string' },
        conditional: { type: 'undefined' },
        value: { type: 'string' },
        related_skills_skill: {
            kind: 'm:1',
            entity: 'SkillsSkillModel',
            joinColumn: 'skill_id'
        }
    },
});
schema._fkMappings = {
    "skill_id": {
        "relationKey": "related_skills_skill",
        "entityName": "SkillsSkillModel",
        "referencedColumn": "id",
        "nullable": false
    }
};
module.exports = {
    SkillsSkillOwnerConditionsModel,
    entity: SkillsSkillOwnerConditionsModel,
    schema: schema
};
