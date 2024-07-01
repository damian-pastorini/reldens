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

        let showPropertiesKeys = Object.keys(properties);
        let listPropertiesKeys = [...showPropertiesKeys];
        let editPropertiesKeys = sc.removeFromArray(listPropertiesKeys, ['id', 'player_id', 'stat_id']);

        return {
            listProperties: listPropertiesKeys,
            showProperties: showPropertiesKeys,
            filterProperties: listPropertiesKeys,
            editProperties: editPropertiesKeys,
            properties,
            ...extraProps
        };
    }

}

module.exports.PlayersStatsEntity = PlayersStatsEntity;
