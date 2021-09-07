/**
 *
 * Reldens - Registered Entities
 *
 */

const { ChatModel } = require('./model');
const { ChatEntity } = require('./entities/chat-entity');

let rawRegisteredEntities = {
    chat: ChatModel
};

let chatConfig = {
    parentItemLabel: null,
    icon: 'Chat',
    sort: {
        direction: 'desc',
        sortBy: 'id'
    }
};

let entitiesConfig = {
    chat: ChatEntity.propertiesConfig(chatConfig)
};

module.exports.rawRegisteredEntities = rawRegisteredEntities;

module.exports.entitiesConfig = entitiesConfig;
