/**
 *
 * Reldens - StatsEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');
const { sc } = require('@reldens/utils');

class StatsEntity extends EntityProperties
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
            [titleProperty]: {
                isRequired: true,
                dbType: 'varchar'
            },
            description: {
                isRequired: true,
                dbType: 'varchar'
            },
            base_value: {
                type: 'number',
                isRequired: true,
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

module.exports.StatsEntity = StatsEntity;
