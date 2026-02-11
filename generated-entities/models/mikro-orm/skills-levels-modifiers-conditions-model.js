/**
 *
 * Reldens - SkillsLevelsModifiersConditionsModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class SkillsLevelsModifiersConditionsModel
{

    constructor(id, levels_modifier_id, key, property_key, conditional, value)
    {
        this.id = id;
        this.levels_modifier_id = levels_modifier_id;
        this.key = key;
        this.property_key = property_key;
        this.conditional = conditional;
        this.value = value;
    }

    static createByProps(props)
    {
        const {id, levels_modifier_id, key, property_key, conditional, value} = props;
        return new this(id, levels_modifier_id, key, property_key, conditional, value);
    }
    
}

const schema = new EntitySchema({
    class: SkillsLevelsModifiersConditionsModel,
    tableName: 'skills_levels_modifiers_conditions',
    properties: {
        id: { type: 'number', primary: true },
        levels_modifier_id: { type: 'number' },
        key: { type: 'string' },
        property_key: { type: 'string' },
        conditional: { type: 'undefined' },
        value: { type: 'string' }
    },
});

module.exports = {
    SkillsLevelsModifiersConditionsModel,
    entity: SkillsLevelsModifiersConditionsModel,
    schema: schema
};
