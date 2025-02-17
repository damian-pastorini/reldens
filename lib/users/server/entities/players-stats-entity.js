/**
 *
 * Reldens - PlayersStatsEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');
const { sc } = require('@reldens/utils');

class PlayersStatsEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            player_id: {
                type: 'reference',
                reference: 'players',
                isRequired: true
            },
            stat_id: {
                type: 'reference',
                reference: 'stats',
                isRequired: true
            },
            base_value: {
                type: 'number',
                isRequired: true
            },
            value: {
                type: 'number',
                isRequired: true
            },
        };

        let showProperties = Object.keys(properties);
        let editProperties = [...showProperties];
        editProperties = sc.removeFromArray(editProperties, ['id', 'player_id', 'stat_id']);

        return {
            showProperties,
            editProperties,
            listProperties: showProperties,
            filterProperties: showProperties,
            properties,
            ...extraProps,
            navigationPosition: 970,
        };
    }

}

module.exports.PlayersStatsEntity = PlayersStatsEntity;
