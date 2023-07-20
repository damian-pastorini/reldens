/**
 *
 * Reldens - Entities Config
 *
 */

const { ChatEntity } = require('./entities/chat-entity');
const { ChatMessageTypesEntity } = require('./entities/chat-message-types-entity');

let chatConfig = {
    parentItemLabel: null,
    icon: 'Chat',
    sort: {
        direction: 'desc',
        sortBy: 'id'
    }
};

let entitiesConfig = {
    chat: ChatEntity.propertiesConfig(chatConfig),
    chatMessagesTypes: ChatMessageTypesEntity.propertiesConfig(chatConfig)
};

module.exports.entitiesConfig = entitiesConfig;
