/**
 *
 * Reldens - RewardsModifiersEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');

class RewardsModifiersEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'key';
        let properties = {
            id: {
                isId: true,
                type: 'number',
                isRequired: true,
                dbType: 'int'
            },
            [titleProperty]: {
                isRequired: true,
                dbType: 'varchar'
            },
            property_key: {
                isRequired: true,
                dbType: 'varchar'
            },
            operation: {
                type: 'reference',
                reference: 'operation_types',
                isRequired: true,
                dbType: 'int'
            },
            value: {
                isRequired: true,
                dbType: 'varchar'
            },
            minValue: {
                dbType: 'varchar'
            },
            maxValue: {
                dbType: 'varchar'
            },
            minProperty: {
                dbType: 'varchar'
            },
            maxProperty: {
                dbType: 'varchar'
            }
        };
        let propertiesKeys = Object.keys(properties);
        let showProperties = propertiesKeys;
        let editProperties = [...propertiesKeys];
        editProperties.splice(editProperties.indexOf('id'), 1);
        let listProperties = propertiesKeys;
        return {
            showProperties,
            editProperties,
            listProperties,
            filterProperties: listProperties,
            properties,
            titleProperty,
            ...extraProps
        };
    }

}

module.exports.RewardsModifiersEntity = RewardsModifiersEntity;
