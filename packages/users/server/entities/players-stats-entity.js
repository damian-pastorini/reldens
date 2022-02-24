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

        let listPropertiesKeys = Object.keys(properties);
        let editPropertiesKeys = sc.removeFromArray(listPropertiesKeys, [
            'id',
            'player_id',
            'stat_id'
        ]);

        return Object.assign({
            listProperties: listPropertiesKeys,
            showProperties: Object.keys(properties),
            filterProperties: listPropertiesKeys,
            editProperties: editPropertiesKeys,
            properties
        }, extraProps);
    }

}

module.exports.PlayersStatsEntity = PlayersStatsEntity;
