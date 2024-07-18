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
        let titleProperty = 'key';
        let properties = {
            id: {},
            [titleProperty]: {
                isRequired: true
            },
            show_tab: {
                type: 'boolean'
            },
            show_in_general: {
                type: 'boolean'
            }
        };

        let showProperties = Object.keys(properties);
        let editProperties = [...showProperties];
        editProperties.splice(editProperties.indexOf('id'), 1);

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

module.exports.ChatMessageTypesEntity = ChatMessageTypesEntity;
