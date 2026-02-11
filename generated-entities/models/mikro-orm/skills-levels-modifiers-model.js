/**
 *
 * Reldens - SkillsLevelsModifiersModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class SkillsLevelsModifiersModel
{

    constructor(id, level_id, key, property_key, operation, value, minValue, maxValue, minProperty, maxProperty)
    {
        this.id = id;
        this.level_id = level_id;
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
        const {id, level_id, key, property_key, operation, value, minValue, maxValue, minProperty, maxProperty} = props;
        return new this(id, level_id, key, property_key, operation, value, minValue, maxValue, minProperty, maxProperty);
    }
    
}

const schema = new EntitySchema({
    class: SkillsLevelsModifiersModel,
    tableName: 'skills_levels_modifiers',
    properties: {
        id: { type: 'number', primary: true },
        level_id: { type: 'number', persist: false },
        key: { type: 'string' },
        property_key: { type: 'string' },
        operation: { type: 'number', persist: false },
        value: { type: 'string' },
        minValue: { type: 'string', nullable: true },
        maxValue: { type: 'string', nullable: true },
        minProperty: { type: 'string', nullable: true },
        maxProperty: { type: 'string', nullable: true },
        related_skills_levels: {
            kind: 'm:1',
            entity: 'SkillsLevelsModel',
            joinColumn: 'level_id'
        },
        related_operation_types: {
            kind: 'm:1',
            entity: 'OperationTypesModel',
            joinColumn: 'operation'
        }
    },
});
schema._fkMappings = {
    "level_id": {
        "relationKey": "related_skills_levels",
        "entityName": "SkillsLevelsModel",
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
    SkillsLevelsModifiersModel,
    entity: SkillsLevelsModifiersModel,
    schema: schema
};
