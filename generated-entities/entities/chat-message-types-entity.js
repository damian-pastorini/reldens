/**
 *
 * Reldens - ChatMessageTypesEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');

class ChatMessageTypesEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'key';
        let properties = {
            id: {
                dbType: 'int'
            },
            [titleProperty]: {
                isRequired: true,
                dbType: 'varchar'
            },
            show_tab: {
                type: 'boolean',
                dbType: 'tinyint'
            },
            also_show_in_type: {
                type: 'reference',
                reference: 'chat_message_types',
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
            titleProperty,
            ...extraProps
        };
    }

}

module.exports.ChatMessageTypesEntity = ChatMessageTypesEntity;
