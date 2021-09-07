/**
 *
 * Reldens - PlayersEntity
 *
 */

const { AdminEntityProperties } = require('../../../admin/server/admin-entity-properties');

class PlayersEntity extends AdminEntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            name: {
                isTitle: true,
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

        let listPropertiesKeys = Object.keys(properties);
        let editPropertiesKeys = [...listPropertiesKeys];

        editPropertiesKeys.splice(editPropertiesKeys.indexOf('id'), 1);
        editPropertiesKeys.splice(editPropertiesKeys.indexOf('created_at'), 1);

        return Object.assign({
            listProperties: listPropertiesKeys,
            showProperties: Object.keys(properties),
            filterProperties: listPropertiesKeys,
            editProperties: editPropertiesKeys,
            properties
        }, extraProps);
    }

}

module.exports.PlayersEntity = PlayersEntity;
