/**
 *
 * Reldens - ChatMessageTypesEntityOverride
 *
 * Extends the chat message types entity with custom property aliases for the admin panel.
 *
 */

const { ChatMessageTypesEntity } = require('../../../../generated-entities/entities/chat-message-types-entity');

class ChatMessageTypesEntityOverride extends ChatMessageTypesEntity
{

    /**
     * @param {Object} extraProps
     * @returns {Object}
     */
    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.properties['also_show_in_type']['alias'] = 'chat_message_type_id';
       return config;
    }

}

module.exports.ChatMessageTypesEntityOverride = ChatMessageTypesEntityOverride;
