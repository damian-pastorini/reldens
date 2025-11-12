/**
 *
 * Reldens - ScoresEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');
const { sc } = require('@reldens/utils');

class ScoresEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {
                isId: true,
                type: 'number',
                isRequired: true,
                dbType: 'int'
            },
            player_id: {
                type: 'reference',
                reference: 'players',
                isRequired: true,
                dbType: 'int'
            },
            total_score: {
                type: 'number',
                isRequired: true,
                dbType: 'int'
            },
            players_kills_count: {
                type: 'number',
                isRequired: true,
                dbType: 'int'
            },
            npcs_kills_count: {
                type: 'number',
                isRequired: true,
                dbType: 'int'
            },
            last_player_kill_time: {
                type: 'datetime',
                dbType: 'datetime'
            },
            last_npc_kill_time: {
                type: 'datetime',
                dbType: 'datetime'
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

module.exports.ScoresEntity = ScoresEntity;
