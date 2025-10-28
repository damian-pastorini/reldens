/**
 *
 * Reldens - RewardsEventsStateEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');

class RewardsEventsStateEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {
                dbType: 'int'
            },
            rewards_events_id: {
                type: 'reference',
                reference: 'rewards_events',
                isRequired: true,
                dbType: 'int'
            },
            player_id: {
                type: 'reference',
                reference: 'players',
                isRequired: true,
                dbType: 'int'
            },
            state: {
                type: 'textarea',
                dbType: 'text'
            }
        };
        let propertiesKeys = Object.keys(properties);
        let showProperties = propertiesKeys;
        let editProperties = [...propertiesKeys];
        editProperties.splice(editProperties.indexOf('id'), 1);
        let listProperties = [...propertiesKeys];
        listProperties.splice(listProperties.indexOf('state'), 1);
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

module.exports.RewardsEventsStateEntity = RewardsEventsStateEntity;
