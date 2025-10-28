/**
 *
 * Reldens - ItemsItemEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');
const { sc } = require('@reldens/utils');

class ItemsItemEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'label';
        let properties = {
            id: {
                dbType: 'int'
            },
            key: {
                isRequired: true,
                dbType: 'varchar'
            },
            type: {
                type: 'reference',
                reference: 'items_types',
                dbType: 'int'
            },
            group_id: {
                type: 'reference',
                reference: 'items_group',
                dbType: 'int'
            },
            [titleProperty]: {
                isRequired: true,
                dbType: 'varchar'
            },
            description: {
                dbType: 'varchar'
            },
            qty_limit: {
                type: 'number',
                dbType: 'int'
            },
            uses_limit: {
                type: 'number',
                dbType: 'int'
            },
            useTimeOut: {
                type: 'number',
                dbType: 'int'
            },
            execTimeOut: {
                type: 'number',
                dbType: 'int'
            },
            customData: {
                type: 'textarea',
                dbType: 'text'
            },
            created_at: {
                type: 'datetime',
                dbType: 'timestamp'
            },
            updated_at: {
                type: 'datetime',
                dbType: 'timestamp'
            }
        };
        let propertiesKeys = Object.keys(properties);
        let showProperties = propertiesKeys;
        let editProperties = sc.removeFromArray([...propertiesKeys], ['id', 'created_at', 'updated_at']);
        let listProperties = [...propertiesKeys];
        listProperties.splice(listProperties.indexOf('customData'), 1);
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

module.exports.ItemsItemEntity = ItemsItemEntity;
