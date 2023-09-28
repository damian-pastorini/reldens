/**
 *
 * Reldens - Entities Config
 *
 */

const { ChatEntity } = require('./entities/chat-entity');
const { ChatMessageTypesEntity } = require('./entities/chat-message-types-entity');

let chatConfig = {
    parentItemLabel: 'Chat',
    icon: 'Chat'
};

let entitiesConfig = {
    chat: ChatEntity.propertiesConfig(Object.assign({sort: {direction: 'desc', sortBy: 'id'}}, chatConfig)),
    chatMessagesTypes: ChatMessageTypesEntity.propertiesConfig(chatConfig)
};

module.exports.entitiesConfig = entitiesConfig;
