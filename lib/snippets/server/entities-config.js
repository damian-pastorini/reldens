/**
 *
 * Reldens - Entities Config
 *
 */

const { LocaleEntityOverride } = require('./entities/locale-entity-override');
const { SnippetsEntityOverride } = require('./entities/snippets-entity-override');
const { UsersLocaleEntityOverride } = require('./entities/users-locale-entity-override');

module.exports.entitiesConfig = {
    locale: LocaleEntityOverride,
    snippets: SnippetsEntityOverride,
    usersLocale: UsersLocaleEntityOverride
};
