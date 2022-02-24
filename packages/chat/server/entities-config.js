/**
 *
 * Reldens - Entities Config
 *
 */

const { ChatEntity } = require('./entities/chat-entity');

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

module.exports.entitiesConfig = entitiesConfig;
