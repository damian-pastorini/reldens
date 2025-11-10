/**
 *
 * Reldens - ItemsGroupEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');
const { sc } = require('@reldens/utils');

class ItemsGroupEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'label';
        let properties = {
            id: {
                isId: true,
                type: 'number',
                isRequired: true,
                dbType: 'int'
            },
            key: {
                isRequired: true,
                dbType: 'varchar'
            },
            [titleProperty]: {
                isRequired: true,
                dbType: 'varchar'
            },
            description: {
                type: 'textarea',
                dbType: 'text'
            },
            files_name: {
                type: 'textarea',
                dbType: 'text'
            },
            sort: {
                type: 'number',
                dbType: 'int'
            },
            items_limit: {
                type: 'number',
                dbType: 'int'
            },
            limit_per_item: {
                type: 'number',
                dbType: 'int'
            }
        };
        let propertiesKeys = Object.keys(properties);
        let showProperties = propertiesKeys;
        let editProperties = [...propertiesKeys];
        editProperties.splice(editProperties.indexOf('id'), 1);
        let listProperties = sc.removeFromArray([...propertiesKeys], ['description', 'files_name']);
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

module.exports.ItemsGroupEntity = ItemsGroupEntity;
