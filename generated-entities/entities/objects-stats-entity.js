/**
 *
 * Reldens - ObjectsStatsEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');

class ObjectsStatsEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {
                dbType: 'int'
            },
            object_id: {
                type: 'reference',
                reference: 'objects',
                isRequired: true,
                dbType: 'int'
            },
            stat_id: {
                type: 'reference',
                reference: 'stats',
                isRequired: true,
                dbType: 'int'
            },
            base_value: {
                type: 'number',
                isRequired: true,
                dbType: 'int'
            },
            value: {
                type: 'number',
                isRequired: true,
                dbType: 'int'
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

module.exports.ObjectsStatsEntity = ObjectsStatsEntity;
