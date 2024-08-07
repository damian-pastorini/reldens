/**
 *
 * Reldens - ScoresEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');
const { sc } = require('@reldens/utils');

class ScoresEntity extends EntityProperties
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
            total_score: {
                type: 'number',
                isRequired: true
            },
            players_kill_count: {
                type: 'number',
                isRequired: true
            },
            npcs_kills_count: {
                type: 'number',
                isRequired: true
            },
            last_player_kill_time: {
                type: 'datetime',
                isRequired: true
            },
            last_npc_kill_time: {
                type: 'datetime',
                isRequired: true
            }
        };

        let showProperties = Object.keys(properties);
        let editProperties = [...showProperties];
        editProperties = sc.removeFromArray(editProperties, ['id', 'last_player_kill_time', 'last_npc_kill_time']);

        return {
            showProperties,
            editProperties,
            listProperties: showProperties,
            filterProperties: showProperties,
            properties,
            ...extraProps
        };
    }

}

module.exports.ScoresEntity = ScoresEntity;
