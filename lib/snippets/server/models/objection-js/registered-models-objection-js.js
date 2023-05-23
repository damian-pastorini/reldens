/**
 *
 * Reldens - Registered Entities
 *
 */

const { LocaleModel } = require('./locale-model');
const { SnippetModel } = require('./snippet-model');
const { UsersLocaleModel } = require('./users-locale-model');
const { entitiesConfig } = require('../../entities-config');
const { entitiesTranslations } = require('../../entities-translations');

let rawRegisteredEntities = {
    locale: LocaleModel,
    snippet: SnippetModel,
    usersLocale: UsersLocaleModel
};

module.exports.rawRegisteredEntities = rawRegisteredEntities;

module.exports.entitiesConfig = entitiesConfig;

module.exports.entitiesTranslations = entitiesTranslations;
