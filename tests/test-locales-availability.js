/**
 *
 * Reldens - Test Locales Availability
 *
 */

const { BaseTest } = require('./base-test');
const { ConfigurationEnricher } = require('../lib/snippets/server/configuration-enricher');
const { SnippetsPlugin } = require('../lib/snippets/client/plugin');
const { Translator } = require('../lib/snippets/translator');
const { SnippetsUi } = require('../lib/snippets/client/snippets-ui');
const { LanguageSaveErrorListener } = require('../lib/snippets/client/language-save-error-listener');
const { InitialGameDataEnricher } = require('../lib/snippets/server/initial-game-data-enricher');
const { SnippetsConst } = require('../lib/snippets/constants');
const { GameConst } = require('../lib/game/constants');
const { ConfigManager } = require('../lib/config/client/config-manager');
const { EventsManager, sc } = require('@reldens/utils');

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
        let config = new ConfigManager();
        config.client = clientConfig;
        await snippetsPlugin.setup({gameManager: {services: {}, config}, events});
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

    async testTheActiveLocaleSnippetGetsItsParameters()
    {
        await this.test('the active locale snippet gets its parameters and its mapped data values', async () => {
            let translator = new Translator({
                snippets: {en_US: {'game.hello': 'Hello %name'}, es_AR: {'game.hello': 'Hola %name %playerLevel'}},
                dataValues: {game: {level: 'playerLevel'}},
                activeLocale: 'es_AR'
            });
            this.assert.strictEqual(translator.t('game.hello', {name: 'Ana', level: 3}), 'Hola Ana 3');
        });
    }

    createUserModelEvent(relatedLocale, continueProcess = true)
    {
        let userEvent = {localeQueries: [], initialGameData: {}, roomGame: {events: new EventsManager()}};
        userEvent.roomGame.events.on('reldens.beforeEnrichUserWithLocale', (startEvent) => {
            startEvent.continueProcess = continueProcess;
        });
        let usersLocaleRepository = {};
        usersLocaleRepository.loadOneByWithRelations = async (field, value) => {
            userEvent.localeQueries.push([field, value]);
            return {related_locale: relatedLocale};
        };
        userEvent.roomGame.dataServer = {getEntity: () => usersLocaleRepository};
        return userEvent;
    }

    async testTheUserLocaleIsTheEnabledLocaleOfTheUser()
    {
        await this.test('the user locale is the enabled locale saved for the user, not for the player', async () => {
            let userEvent = this.createUserModelEvent({id: 2, locale: 'es_ES', enabled: 1});
            await InitialGameDataEnricher.withLocale(userEvent.initialGameData, userEvent.roomGame, {}, {id: 1001});
            this.assert.deepStrictEqual(userEvent.localeQueries, [['user_id', 1001]]);
            this.assert.deepStrictEqual(userEvent.initialGameData.userLocale, {id: 2, locale: 'es_ES', enabled: 1});
        });
    }

    async testADisabledSavedLocaleIsNotTheUserLocale()
    {
        await this.test('a saved locale disabled later is not sent as the user locale', async () => {
            let userEvent = this.createUserModelEvent({id: 2, locale: 'es_ES', enabled: 0});
            await InitialGameDataEnricher.withLocale(userEvent.initialGameData, userEvent.roomGame, {}, {id: 1001});
            this.assert.strictEqual(sc.hasOwn(userEvent.initialGameData, 'userLocale'), false);
        });
    }

    async testTheCancelledEnrichAddsNoUserLocale()
    {
        await this.test('a listener cancelling the locale enrich adds no user locale and loads nothing', async () => {
            let userEvent = this.createUserModelEvent({id: 2, locale: 'es_ES', enabled: 1}, false);
            let result = await InitialGameDataEnricher.withLocale(userEvent.initialGameData, userEvent.roomGame, {}, {id: 1});
            this.assert.strictEqual(result, false);
            this.assert.deepStrictEqual(userEvent.localeQueries, []);
            this.assert.deepStrictEqual(userEvent.initialGameData, {});
        });
    }

    createSnippetsUi(locales)
    {
        let selectorUi = {hiddenClasses: [], localeSelector: {options: []}};
        selectorUi.localeSelector.appendChild = (option) => selectorUi.localeSelector.options.push(option);
        selectorUi.localeSelector.addEventListener = () => true;
        let saveError = {dataset: {}, classList: {}};
        saveError.classList.add = (className) => selectorUi.hiddenClasses.push(className);
        saveError.classList.remove = (className) => {
            selectorUi.hiddenClasses.splice(selectorUi.hiddenClasses.indexOf(className), 1);
        };
        selectorUi.elements = {
            '.snippets-setting': selectorUi.localeSelector,
            [SnippetsConst.SELECTORS.SAVE_ERROR]: saveError
        };
        let gameDom = {appendToElement: () => true, createElement: () => ({})};
        gameDom.getElement = (selector) => sc.get(selectorUi.elements, selector, false);
        let gameManager = {
            services: {translator: new Translator({snippets: {en_US: {}}})},
            gameEngine: {parseTemplate: () => 'snippets-settings'},
            gameDom
        };
        selectorUi.snippetsUi = new SnippetsUi({cache: {html: {get: () => 'snippets-template'}}, gameManager}, locales);
        return selectorUi;
    }

    async testTheSelectorOptionsAreLabeledByCountryOrLocale()
    {
        await this.test('the selector options show the country code or the locale code and the active one is selected', async () => {
            let selectorUi = this.createSnippetsUi({
                0: {id: 1, locale: 'en_US', country_code: 'US'},
                1: {id: 2, locale: 'es_ES', country_code: 'ES'},
                2: {id: 3, locale: 'pt_BR', country_code: null}
            });
            this.assert.strictEqual(selectorUi.snippetsUi.createUi(), true);
            this.assert.deepStrictEqual(
                selectorUi.localeSelector.options.map(option => [option.value, option.textContent, option.selected]),
                [[1, 'US', true], [2, 'ES', false], [3, 'pt_BR', false]]
            );
        });
    }

    async testOneLocaleCreatesNoSelector()
    {
        await this.test('a single available locale creates no language selector', async () => {
            let selectorUi = this.createSnippetsUi({0: {id: 1, locale: 'en_US', country_code: 'US'}});
            this.assert.strictEqual(selectorUi.snippetsUi.createUi(), false);
            this.assert.deepStrictEqual(selectorUi.localeSelector.options, []);
        });
    }

    async testOnlyTheLastChangeErrorIsShown()
    {
        await this.test('only the save error of the last change is shown and other snippets acts show nothing', async () => {
            let selectorUi = this.createSnippetsUi({});
            let errorListener = new LanguageSaveErrorListener(selectorUi.snippetsUi);
            selectorUi.snippetsUi.hideSaveError(1);
            selectorUi.snippetsUi.hideSaveError(2);
            let errorMessage = {act: SnippetsConst.ACTIONS.UPDATE_ERROR, changedAt: 1};
            this.assert.strictEqual(await errorListener.executeClientMessageActions({message: errorMessage}), false);
            let otherAct = {act: SnippetsConst.ACTIONS.UPDATE, changedAt: 2};
            this.assert.strictEqual(await errorListener.executeClientMessageActions({message: otherAct}), false);
            this.assert.deepStrictEqual(selectorUi.hiddenClasses, [GameConst.CLASSES.HIDDEN, GameConst.CLASSES.HIDDEN]);
            errorMessage.changedAt = 2;
            this.assert.strictEqual(await errorListener.executeClientMessageActions({message: errorMessage}), true);
            this.assert.deepStrictEqual(selectorUi.hiddenClasses, [GameConst.CLASSES.HIDDEN]);
            delete selectorUi.elements[SnippetsConst.SELECTORS.SAVE_ERROR];
            this.assert.strictEqual(selectorUi.snippetsUi.showSaveError(2), false);
        });
    }

}

module.exports.TestLocalesAvailability = TestLocalesAvailability;
