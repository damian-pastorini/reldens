/**
 *
 * Reldens - Entities Config
 *
 */

const { LocaleEntity } = require('./entities/locale-entity');
const { SnippetEntity } = require('./entities/snippet-entity');

let snippetConfig = {
    parentItemLabel: 'Translations',
    icon: 'Chat',
    sort: {
        direction: 'desc',
        sortBy: 'id'
    }
};

let entitiesConfig = {
    locale: LocaleEntity.propertiesConfig(snippetConfig),
    snippet: SnippetEntity.propertiesConfig(snippetConfig),
};

module.exports.entitiesConfig = entitiesConfig;
