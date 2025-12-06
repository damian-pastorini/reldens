/**
 *
 * Reldens - ChatMessageTypesEntityOverride
 *
 */

const { ChatMessageTypesEntity } = require('../../../../generated-entities/entities/chat-message-types-entity');

class ChatMessageTypesEntityOverride extends ChatMessageTypesEntity
{

    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        // config.showProperties['also_show_in_type']['alias'] = 'chat_message_type_id';
        // config.editProperties['also_show_in_type']['alias'] = 'chat_message_type_id';
        // config.listProperties['also_show_in_type']['alias'] = 'chat_message_type_id';
        // config.filterProperties['also_show_in_type']['alias'] = 'chat_message_type_id';
        config.properties['also_show_in_type']['alias'] = 'chat_message_type_id';
       return config;
    }

}

module.exports.ChatMessageTypesEntityOverride = ChatMessageTypesEntityOverride;
