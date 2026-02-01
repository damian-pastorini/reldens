/**
 *
 * Reldens - SkillsSkillOwnerEffectsModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class SkillsSkillOwnerEffectsModel
{

    constructor(id, skill_id, key, property_key, operation, value, minValue, maxValue, minProperty, maxProperty)
    {
        this.id = id;
        this.skill_id = skill_id;
        this.key = key;
        this.property_key = property_key;
        this.operation = operation;
        this.value = value;
        this.minValue = minValue;
        this.maxValue = maxValue;
        this.minProperty = minProperty;
        this.maxProperty = maxProperty;
    }

    static createByProps(props)
    {
        const {id, skill_id, key, property_key, operation, value, minValue, maxValue, minProperty, maxProperty} = props;
        return new this(id, skill_id, key, property_key, operation, value, minValue, maxValue, minProperty, maxProperty);
    }
    
}

const schema = new EntitySchema({
    class: SkillsSkillOwnerEffectsModel,
    tableName: 'skills_skill_owner_effects',
    properties: {
        id: { type: 'number', primary: true },
        skill_id: { type: 'number', persist: false },
        key: { type: 'string' },
        property_key: { type: 'string' },
        operation: { type: 'number', persist: false },
        value: { type: 'string' },
        minValue: { type: 'string' },
        maxValue: { type: 'string' },
        minProperty: { type: 'string', nullable: true },
        maxProperty: { type: 'string', nullable: true },
        related_skills_skill: {
            kind: 'm:1',
            entity: 'SkillsSkillModel',
            joinColumn: 'skill_id'
        },
        related_operation_types: {
            kind: 'm:1',
            entity: 'OperationTypesModel',
            joinColumn: 'operation'
        },
        related_skills_skill_owner_effects_conditions: {
            kind: '1:m',
            entity: 'SkillsSkillOwnerEffectsConditionsModel',
            mappedBy: 'related_skills_skill_owner_effects'
        }
    },
});
schema._fkMappings = {
    "skill_id": {
        "relationKey": "related_skills_skill",
        "entityName": "SkillsSkillModel",
        "referencedColumn": "id",
        "nullable": false
    },
    "operation": {
        "relationKey": "related_operation_types",
        "entityName": "OperationTypesModel",
        "referencedColumn": "key",
        "nullable": false
    }
};
module.exports = {
    SkillsSkillOwnerEffectsModel,
    entity: SkillsSkillOwnerEffectsModel,
    schema: schema
};
