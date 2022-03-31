/**
 *
 * Reldens - Registered Entities
 *
 */

const { ChatModel } = require('./chat-model');
const { entitiesConfig } = require('../../entities-config');

let rawRegisteredEntities = {
    chat: ChatModel
};

module.exports.rawRegisteredEntities = rawRegisteredEntities;

module.exports.entitiesConfig = entitiesConfig;
