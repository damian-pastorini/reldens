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
            also_show_in_type: {
                type: 'reference',
                reference: 'chat_message_types',
                alias: 'chat_message_type_id'
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
