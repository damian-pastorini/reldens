/**
 *
 * Reldens - ClanLevelsModifiersModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class ClanLevelsModifiersModel
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
    class: ClanLevelsModifiersModel,
    tableName: 'clan_levels_modifiers',
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
        related_clan_levels: {
            kind: 'm:1',
            entity: 'ClanLevelsModel',
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
        "relationKey": "related_clan_levels",
        "entityName": "ClanLevelsModel",
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
    ClanLevelsModifiersModel,
    entity: ClanLevelsModifiersModel,
    schema: schema
};
