/**
 *
 * Reldens - ChatMessageTypesEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class ChatMessageTypesEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            key: {
                isRequired: true
            },
            show_tab: {
                type: 'boolean'
            },
            show_in_general: {
                type: 'boolean'
            }
        };

        let listPropertiesKeys = Object.keys(properties);
        let editPropertiesKeys = [...listPropertiesKeys];

        editPropertiesKeys.splice(editPropertiesKeys.indexOf('id'), 1);

        return Object.assign({
            listProperties: listPropertiesKeys,
            showProperties: Object.keys(properties),
            filterProperties: listPropertiesKeys,
            editProperties: editPropertiesKeys,
            properties
        }, extraProps);
    }

}

module.exports.ChatMessageTypesEntity = ChatMessageTypesEntity;
