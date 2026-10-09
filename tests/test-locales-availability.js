/**
 *
 * Reldens - Test Locales Availability
 *
 */

const { BaseTest } = require('./base-test');
const { ConfigurationEnricher } = require('../lib/snippets/server/configuration-enricher');
const { SnippetsUi } = require('../lib/snippets/client/snippets-ui');
const { Translator } = require('../lib/snippets/translator');

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

    createUiScene(clientConfig)
    {
        return {gameManager: {services: {translator: new Translator({})}, config: {client: clientConfig}}};
    }

    async testTheSelectorOnlyListsTheLocalesWithTranslations()
    {
        await this.test('the language selector only lists the locales with translations', async () => {
            let snippetsUi = new SnippetsUi(this.createUiScene({
                locales: [{id: 1, locale: 'en_US', country_code: 'US'}, {id: 1001, locale: 'te_TS', country_code: 'TS'}],
                snippets: {en_US: {'translator.title': 'Languages Settings'}, te_TS: {}}
            }));
            this.assert.deepStrictEqual(snippetsUi.fetchAvailableLocales(), {
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
