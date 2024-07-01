/**
 *
 * Reldens - PlayersEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

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
            }
        };

        let showPropertiesKeys = Object.keys(properties);
        let listPropertiesKeys = [...showPropertiesKeys];
        let editPropertiesKeys = [...listPropertiesKeys];

        editPropertiesKeys.splice(editPropertiesKeys.indexOf('id'), 1);
        editPropertiesKeys.splice(editPropertiesKeys.indexOf('created_at'), 1);

        return {
            listProperties: listPropertiesKeys,
            showProperties: showPropertiesKeys,
            filterProperties: listPropertiesKeys,
            editProperties: editPropertiesKeys,
            properties,
            titleProperty,
            ...extraProps
        };
    }

}

module.exports.PlayersEntity = PlayersEntity;
