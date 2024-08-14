/**
 *
 * Reldens - ScoresDetailEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');
const { sc } = require('@reldens/utils');

class ScoresDetailEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'label';
        let properties = {
            id: {},
            player_id: {
                type: 'reference',
                reference: 'players',
                isRequired: true
            },
            obtained_score: {
                type: 'number',
                isRequired: true
            },
            kill_time: {
                type: 'datetime',
                isRequired: true
            },
            kill_player_id: {
                type: 'reference',
                reference: 'players',
                isRequired: true
            },
            kill_npc_id: {
                type: 'reference',
                reference: 'objects',
                isRequired: true
            }
        };

        let showProperties = Object.keys(properties);
        let listProperties = [...showProperties];
        let editProperties = [...showProperties];
        editProperties = sc.removeFromArray(editProperties, ['id', 'kill_time']);

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

module.exports.ScoresDetailEntity = ScoresDetailEntity;
