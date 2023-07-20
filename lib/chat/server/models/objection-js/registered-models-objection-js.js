/**
 *
 * Reldens - Registered Models
 *
 */

const { ChatModel } = require('./chat-model');
const { ChatMessageTypesModel } = require('./chat-message-types-model');
const { entitiesConfig } = require('../../entities-config');
const {entitiesTranslations} = require("../../../../actions/server/entities-translations");

let rawRegisteredEntities = {
    chat: ChatModel,
    chatMessagesTypes: ChatMessageTypesModel
};

module.exports.rawRegisteredEntities = rawRegisteredEntities;

module.exports.entitiesConfig = entitiesConfig;

module.exports.entitiesTranslations = entitiesTranslations;
