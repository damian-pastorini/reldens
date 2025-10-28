/**
 *
 * Reldens - RewardsEventsEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');

class RewardsEventsEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'label';
        let properties = {
            id: {
                dbType: 'int'
            },
            [titleProperty]: {
                isRequired: true,
                dbType: 'varchar'
            },
            description: {
                dbType: 'varchar'
            },
            handler_key: {
                isRequired: true,
                dbType: 'varchar'
            },
            event_key: {
                isRequired: true,
                dbType: 'varchar'
            },
            event_data: {
                isRequired: true,
                dbType: 'varchar'
            },
            position: {
                type: 'number',
                dbType: 'int'
            },
            enabled: {
                type: 'boolean',
                dbType: 'tinyint'
            },
            active_from: {
                type: 'datetime',
                dbType: 'datetime'
            },
            active_to: {
                type: 'datetime',
                dbType: 'datetime'
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

module.exports.RewardsEventsEntity = RewardsEventsEntity;
