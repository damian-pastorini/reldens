/**
 *
 * Reldens - ChatEntityOverride
 *
 */

const { ChatEntity } = require('../../../../generated-entities/entities/chat-entity');

class ChatEntityOverride extends ChatEntity
{

    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config = this.updateProperty(config, 'player_id', 'alias', 'chat_player_id');
        config = this.updateProperty(config, 'room_id', 'alias', 'chat_room');
        config = this.updateProperty(config, 'private_player_id', 'alias', 'chat_private_player_id');
        config = this.updateProperty(config, 'message_type', 'alias', 'chat_type');
        config.navigationPosition = 1000;
        config.sort = {direction: 'desc', sortBy: 'id'};
        return config;
    }

    static updateProperty(config, propertyName, propertyField, propertyValue)
    {
        // config.showProperties[propertyName][propertyField] = propertyValue;
        // config.editProperties[propertyName][propertyField] = propertyValue;
        // config.listProperties[propertyName][propertyField] = propertyValue;
        // config.filterProperties[propertyName][propertyField] = propertyValue;
        config.properties[propertyName][propertyField] = propertyValue;
        return config;
    }

}

module.exports.ChatEntityOverride = ChatEntityOverride;
