/**
 *
 * Reldens - Entities Config
 *
 */

const { ChatEntityOverride } = require('./entities/chat-entity-override');
const { ChatMessageTypesEntityOverride } = require('./entities/chat-message-types-entity-override');

module.exports.entitiesConfig = {
    chat: ChatEntityOverride,
    chatMessagesTypes: ChatMessageTypesEntityOverride
};
