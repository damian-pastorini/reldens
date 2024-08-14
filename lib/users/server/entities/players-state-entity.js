/**
 *
 * Reldens - PlayersStateEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');
const { sc } = require('@reldens/utils');

class PlayersStateEntity extends EntityProperties
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
            room_id: {
                type: 'reference',
                reference: 'rooms',
                isRequired: true
            },
            x: {
                type: 'number',
                isRequired: true
            },
            y: {
                type: 'number',
                isRequired: true
            },
            dir: {
                isRequired: true
            }
        };

        let showProperties = Object.keys(properties);
        let editProperties = [...showProperties];
        editProperties = sc.removeFromArray([...editProperties], ['id', 'player_id']);

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

module.exports.PlayersStateEntity = PlayersStateEntity;
