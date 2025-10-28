/**
 *
 * Reldens - PlayersStateEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');

class PlayersStateEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {
                dbType: 'int'
            },
            player_id: {
                type: 'reference',
                reference: 'players',
                isRequired: true,
                dbType: 'int'
            },
            room_id: {
                type: 'reference',
                reference: 'rooms',
                isRequired: true,
                dbType: 'int'
            },
            x: {
                type: 'number',
                isRequired: true,
                dbType: 'int'
            },
            y: {
                type: 'number',
                isRequired: true,
                dbType: 'int'
            },
            dir: {
                isRequired: true,
                dbType: 'varchar'
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

module.exports.PlayersStateEntity = PlayersStateEntity;
