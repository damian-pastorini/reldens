/**
 *
 * Reldens - Test Locales Availability
 *
 */

const { BaseTest } = require('./base-test');
const { ConfigurationEnricher } = require('../lib/snippets/server/configuration-enricher');
const { SnippetsPlugin } = require('../lib/snippets/client/plugin');
const { Translator } = require('../lib/snippets/translator');
const { EventsManager } = require('@reldens/utils');

class TestLocalesAvailability extends BaseTest
{

    async testOnlyTheEnabledLocalesAreSentToTheClient()
    {
        await this.test('only the enabled locales and their snippets are sent to the client config', async () => {
            let localesFilters = [];
            let serverManager = {configManager: {configList: {client: {}}}};
            await new ConfigurationEnricher({
                localeRepository: {
                    load: async (filters) => localesFilters.push(filters) && [{id: 1, locale: 'en_US', enabled: 1}]
                },
                snippetRepository: {loadBy: async () => [{key: 'test.snippet.list', value: 'Test snippet'}]}
            }).withLocalesAndSnippets({serverManager});
            this.assert.deepStrictEqual(localesFilters, [{enabled: 1}]);
            this.assert.deepStrictEqual(serverManager.configManager.configList.client.locales, [
                {id: 1, locale: 'en_US', enabled: 1}
            ]);
        });
    }

    async setupSnippetsPlugin(events, clientConfig)
    {
        let snippetsPlugin = new SnippetsPlugin();
        await snippetsPlugin.setup({gameManager: {services: {}, config: {client: clientConfig}}, events});
        return snippetsPlugin;
    }

    async testTheSelectorOnlyListsTheLocalesWithTranslations()
    {
        await this.test('only the locales with translations are available after the engine creation starts', async () => {
            let events = new EventsManager();
            let snippetsPlugin = await this.setupSnippetsPlugin(events, {
                locales: [{id: 1, locale: 'en_US', country_code: 'US'}, {id: 1001, locale: 'te_TS', country_code: 'TS'}],
                snippets: {te_TS: {}},
                message: {listeners: {}}
            });
            await events.emit('reldens.beforeCreateEngine');
            this.assert.deepStrictEqual(snippetsPlugin.availableLocales, {
                0: {id: 1, locale: 'en_US', country_code: 'US'}
            });
        });
    }

    async testTheMissingSnippetUsesTheDefaultLocale()
    {
        await this.test('a snippet missing in the active locale uses the default locale text', async () => {
            let translator = new Translator({
                snippets: {en_US: {'translator.title': 'Languages Settings'}, es_AR: {}},
                activeLocale: 'es_AR'
            });
            this.assert.strictEqual(translator.t('translator.title'), 'Languages Settings');
            this.assert.strictEqual(translator.t('translator.missing'), 'translator.missing');
        });
    }

}

module.exports.TestLocalesAvailability = TestLocalesAvailability;
