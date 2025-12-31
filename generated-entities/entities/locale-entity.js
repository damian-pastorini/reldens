/**
 *
 * Reldens - LocaleEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');

class LocaleEntity extends EntityProperties
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
            locale: {
                isRequired: true,
                dbType: 'varchar'
            },
            language_code: {
                isRequired: true,
                dbType: 'varchar'
            },
            country_code: {
                dbType: 'varchar'
            },
            enabled: {
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

module.exports.LocaleEntity = LocaleEntity;
