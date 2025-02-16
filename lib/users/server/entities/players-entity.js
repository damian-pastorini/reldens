/**
 *
 * Reldens - PlayersEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');
const { sc } = require('@reldens/utils');

class PlayersEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'name';
        let properties = {
            id: {},
            [titleProperty]: {
                isRequired: true
            },
            user_id: {
                type: 'reference',
                reference: 'users',
                isRequired: true
            },
            created_at: {
                type: 'datetime',
                isRequired: true
            },
            updated_at: {
                type: 'datetime',
            }
        };

        let showProperties = Object.keys(properties);
        let editProperties = [...showProperties];
        editProperties = sc.removeFromArray(editProperties, ['id', 'created_at', 'updated_at']);

        return {
            showProperties,
            editProperties,
            listProperties: showProperties,
            filterProperties: showProperties,
            properties,
            titleProperty,
            ...extraProps
        };
    }

}

module.exports.PlayersEntity = PlayersEntity;
