/**
 *
 * Reldens - FeaturesEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');

class FeaturesEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'title';
        let properties = {
            id: {
                isId: true,
                type: 'number',
                isRequired: true,
                dbType: 'int'
            },
            code: {
                isRequired: true,
                dbType: 'varchar'
            },
            [titleProperty]: {
                isRequired: true,
                dbType: 'varchar'
            },
            is_enabled: {
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
            titleProperty,
            ...extraProps
        };
    }

}

module.exports.FeaturesEntity = FeaturesEntity;
