/**
 *
 * Reldens - RewardsEventsStateEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class RewardsEventsStateEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            rewards_events_id: {
                type: 'reference',
                reference: 'rewardsEvents',
                isRequired: true
            },
            player_id: {
                type: 'reference',
                reference: 'players',
                isRequired: true
            },
            state: {}
        };

        let showProperties = Object.keys(properties);
        let listProperties = [...showProperties];
        let editProperties = [...showProperties];
        editProperties.splice(editProperties.indexOf('id'), 1);

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
