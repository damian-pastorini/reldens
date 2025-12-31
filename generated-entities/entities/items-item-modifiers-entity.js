/**
 *
 * Reldens - ItemsItemModifiersEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');

class ItemsItemModifiersEntity extends EntityProperties
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
            item_id: {
                type: 'reference',
                reference: 'items_item',
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

module.exports.ItemsItemModifiersEntity = ItemsItemModifiersEntity;
