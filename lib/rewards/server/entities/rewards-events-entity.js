/**
 *
 * Reldens - RewardsEventsEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class RewardsEventsEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'event_key';
        let properties = {
            id: {},
            [titleProperty]: {
                isRequired: true
            },
            event_data: {
                isRequired: true
            },
            enabled: {
                isRequired: true
            },
            active_from: {},
            active_to: {}
        };

        let showProperties = Object.keys(properties);
        let listProperties = [...showProperties];
        let editProperties = [...showProperties];
        listProperties.splice(listProperties.indexOf('event_data'), 1);
        editProperties.splice(editProperties.indexOf('id'), 1);

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
