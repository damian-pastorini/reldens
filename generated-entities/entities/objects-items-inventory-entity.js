/**
 *
 * Reldens - ObjectsItemsInventoryEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');

class ObjectsItemsInventoryEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {
                isId: true,
                type: 'number',
                isRequired: true,
                dbType: 'int'
            },
            owner_id: {
                type: 'reference',
                reference: 'objects',
                isRequired: true,
                dbType: 'int'
            },
            item_id: {
                type: 'reference',
                reference: 'items_item',
                isRequired: true,
                dbType: 'int'
            },
            qty: {
                type: 'number',
                dbType: 'int'
            },
            remaining_uses: {
                type: 'number',
                dbType: 'int'
            },
            is_active: {
                type: 'boolean',
                dbType: 'tinyint'
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
            ...extraProps
        };
    }

}

module.exports.ObjectsItemsInventoryEntity = ObjectsItemsInventoryEntity;
