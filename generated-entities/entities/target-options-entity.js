/**
 *
 * Reldens - TargetOptionsEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');

class TargetOptionsEntity extends EntityProperties
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
            target_key: {
                isRequired: true,
                dbType: 'varchar'
            },
            target_label: {
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
            ...extraProps
        };
    }

}

module.exports.TargetOptionsEntity = TargetOptionsEntity;
