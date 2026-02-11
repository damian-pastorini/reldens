/**
 *
 * Reldens - RewardsModifiersModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class RewardsModifiersModel
{

    constructor(id, key, property_key, operation, value, minValue, maxValue, minProperty, maxProperty)
    {
        this.id = id;
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
        const {id, key, property_key, operation, value, minValue, maxValue, minProperty, maxProperty} = props;
        return new this(id, key, property_key, operation, value, minValue, maxValue, minProperty, maxProperty);
    }
    
}

const schema = new EntitySchema({
    class: RewardsModifiersModel,
    tableName: 'rewards_modifiers',
    properties: {
        id: { type: 'number', primary: true },
        key: { type: 'string' },
        property_key: { type: 'string' },
        operation: { type: 'number', persist: false },
        value: { type: 'string' },
        minValue: { type: 'string', nullable: true },
        maxValue: { type: 'string', nullable: true },
        minProperty: { type: 'string', nullable: true },
        maxProperty: { type: 'string', nullable: true },
        related_operation_types: {
            kind: 'm:1',
            entity: 'OperationTypesModel',
            joinColumn: 'operation'
        },
        related_rewards: {
            kind: '1:m',
            entity: 'RewardsModel',
            mappedBy: 'related_rewards_modifiers'
        }
    },
});
schema._fkMappings = {
    "operation": {
        "relationKey": "related_operation_types",
        "entityName": "OperationTypesModel",
        "referencedColumn": "id",
        "nullable": false
    }
};
module.exports = {
    RewardsModifiersModel,
    entity: RewardsModifiersModel,
    schema: schema
};
