/**
 *
 * Reldens - ScoresDetailEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');

class ScoresDetailEntity extends EntityProperties
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
            obtained_score: {
                type: 'number',
                isRequired: true,
                dbType: 'int'
            },
            kill_time: {
                type: 'datetime',
                dbType: 'datetime'
            },
            kill_player_id: {
                type: 'number',
                dbType: 'int'
            },
            kill_npc_id: {
                type: 'number',
                dbType: 'int'
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
            ...extraProps
        };
    }

}

module.exports.ScoresDetailEntity = ScoresDetailEntity;
