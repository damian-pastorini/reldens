/**
 *
 * Reldens - ItemsTypesEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');

class ItemsTypesEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'key';
        let properties = {
            id: {
                dbType: 'int'
            },
            [titleProperty]: {
                isRequired: true,
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

module.exports.ItemsTypesEntity = ItemsTypesEntity;
