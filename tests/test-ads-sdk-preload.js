/**
 *
 * Reldens - Test Ads SDK Preload
 *
 */

const { BaseTest } = require('./base-test');
const { AdsPlugin } = require('../lib/ads/client/plugin');
const { AdsConst } = require('../lib/ads/constants');
const { GameConst } = require('../lib/game/constants');
const { EventsManager, sc } = require('@reldens/utils');

class TestAdsSdkPreload extends BaseTest
{

    createElement(hiddenClasses)
    {
        return {
            hiddenClasses,
            classList: {toggle: (className, isAdded) => hiddenClasses.push(isAdded ? className : '')}
        };
    }

    createScript()
    {
        let script = {listeners: {}};
        script.addEventListener = (eventType, callback) => script.listeners[eventType] = callback;
        return script;
    }

    createGameManager(adsGeneral)
    {
        let gameManager = {
            appendedScripts: [],
            gameIdsOnAppend: [],
            muteStates: [],
            window: {},
            adsGeneral,
            events: {on: () => true},
            formsContainer: this.createElement([]),
            sdkError: this.createElement([])
        };
        let elements = {
            body: {append: (script) => gameManager.appendedScripts.push(script)
                && gameManager.gameIdsOnAppend.push(sc.get(gameManager.window.SDK_OPTIONS, 'gameId', false))},
            [GameConst.SELECTORS.FORMS_CONTAINER]: gameManager.formsContainer,
            [AdsConst.SELECTORS.SDK_ERROR]: gameManager.sdkError
        };
        gameManager.gameDom = {
            getElement: (selector) => elements[selector],
            createElement: () => this.createScript(),
            getWindow: () => gameManager.window
        };
        gameManager.config = {
            client: {},
            get: (path, defaultValue) => defaultValue,
            getWithoutLogs: (path, defaultValue) => this.fetchConfigValue(gameManager.adsGeneral, path, defaultValue)
        };
        gameManager.audioManager = {changeMuteState: async (...muteState) => gameManager.muteStates.push(muteState)};
        return gameManager;
    }

    fetchConfigValue(adsGeneral, path, defaultValue)
    {
        return sc.get(
            {'client/ads/general': adsGeneral, [AdsConst.CONFIG_PATHS.SDK_REQUIRED]: adsGeneral.sdkRequired},
            path,
            defaultValue
        );
    }

    preloadPlugin(gameManager)
    {
        let adsPlugin = new AdsPlugin();
        this.assert.strictEqual(adsPlugin.preload({gameManager, events: gameManager.events}), true);
        return adsPlugin;
    }

    async testPreloadAppendsTheEnabledProvidersSdk()
    {
        await this.test('the preload appends the SDK script of every enabled provider with an SDK URL', async () => {
            let gameManager = this.createGameManager({providers: {
                providerOne: {enabled: 1, sdkUrl: 'https://sdk.test/one.js'},
                providerTwo: {enabled: 0, sdkUrl: 'https://sdk.test/two.js'},
                providerThree: {enabled: 1}
            }});
            this.preloadPlugin(gameManager);
            this.assert.deepStrictEqual(
                gameManager.appendedScripts.map(script => script.src),
                ['https://sdk.test/one.js']
            );
            this.assert.deepStrictEqual(gameManager.formsContainer.hiddenClasses, []);
        });
    }

    async testPreloadWithoutProvidersAppendsNothing()
    {
        await this.test('the preload without the ads providers config appends no script', async () => {
            let gameManager = this.createGameManager({});
            this.preloadPlugin(gameManager);
            this.assert.deepStrictEqual(gameManager.appendedScripts, []);
        });
    }

    async testActivationAppendsOnlyTheMissingSdk()
    {
        await this.test('the providers activation appends only the SDK of a provider enabled after the preload', async () => {
            let gameManager = this.createGameManager({providers: {
                providerOne: {enabled: 1, sdkUrl: 'https://sdk.test/one.js'},
                providerTwo: {enabled: 0, sdkUrl: 'https://sdk.test/two.js'}
            }});
            let adsPlugin = this.preloadPlugin(gameManager);
            let preloadSdkHandler = adsPlugin.sdkHandler;
            gameManager.adsGeneral = {providers: {
                providerOne: {enabled: 1, sdkUrl: 'https://sdk.test/one.js'},
                providerTwo: {enabled: 1, sdkUrl: 'https://sdk.test/two.js'}
            }};
            adsPlugin.setup({gameManager, events: gameManager.events});
            this.assert.strictEqual(adsPlugin.sdkHandler, preloadSdkHandler);
            this.assert.deepStrictEqual(Object.keys(adsPlugin.activeProviders), ['providerOne', 'providerTwo']);
            await adsPlugin.sdkHandler.setupProvidersSdk(adsPlugin.activeProviders, gameManager);
            this.assert.deepStrictEqual(
                gameManager.appendedScripts.map(script => script.src),
                ['https://sdk.test/one.js', 'https://sdk.test/two.js']
            );
        });
    }

    async testRequiredSdkShowsTheLoginOnceEveryScriptLoads()
    {
        await this.test('a required SDK hides the login until every SDK script loads', async () => {
            let gameManager = this.createGameManager({sdkRequired: true, providers: {
                providerOne: {enabled: 1, sdkUrl: 'https://sdk.test/one.js'},
                providerTwo: {enabled: 1, sdkUrl: 'https://sdk.test/two.js'}
            }});
            this.preloadPlugin(gameManager);
            let hiddenClass = AdsConst.CLASSES.HIDDEN_FORCED;
            this.assert.deepStrictEqual(gameManager.formsContainer.hiddenClasses, [hiddenClass]);
            gameManager.appendedScripts[0].listeners.load();
            this.assert.deepStrictEqual(gameManager.formsContainer.hiddenClasses, [hiddenClass]);
            gameManager.appendedScripts[1].listeners.load();
            this.assert.deepStrictEqual(gameManager.formsContainer.hiddenClasses, [hiddenClass, '']);
            this.assert.deepStrictEqual(gameManager.sdkError.hiddenClasses, []);
        });
    }

    async testRequiredSdkFailureKeepsTheLoginHidden()
    {
        await this.test('a required SDK that fails to load keeps the login hidden and shows the SDK error', async () => {
            let gameManager = this.createGameManager({sdkRequired: true, providers: {
                providerOne: {enabled: 1, sdkUrl: 'https://sdk.test/one.js'},
                providerTwo: {enabled: 1, sdkUrl: 'https://sdk.test/two.js'}
            }});
            this.preloadPlugin(gameManager);
            gameManager.appendedScripts[0].listeners.error();
            gameManager.appendedScripts[1].listeners.load();
            this.assert.deepStrictEqual(gameManager.formsContainer.hiddenClasses, [AdsConst.CLASSES.HIDDEN_FORCED]);
            this.assert.deepStrictEqual(gameManager.sdkError.hiddenClasses, ['']);
        });
    }

    async testRequiredSdkWithoutScriptsKeepsTheLogin()
    {
        await this.test('a required SDK without enabled providers SDK scripts keeps the login visible', async () => {
            let gameManager = this.createGameManager({sdkRequired: true, providers: {
                providerOne: {enabled: 0, sdkUrl: 'https://sdk.test/one.js'}
            }});
            this.preloadPlugin(gameManager);
            this.assert.deepStrictEqual(gameManager.appendedScripts, []);
            this.assert.deepStrictEqual(gameManager.formsContainer.hiddenClasses, []);
        });
    }

    createGameMonetizeGameManager(gameId)
    {
        let gameManager = this.createGameManager({providers: {
            gameMonetize: {id: 2, enabled: 1, sdkUrl: 'https://sdk.test/game-monetize.js', gameId}
        }});
        gameManager.events = new EventsManager();
        return gameManager;
    }

    async activateProviders(adsPlugin, gameManager)
    {
        gameManager.window.sdk = {showBanner: async () => true};
        adsPlugin.setup({gameManager, events: gameManager.events});
        await adsPlugin.sdkHandler.setupProvidersSdk(adsPlugin.activeProviders, gameManager);
        return adsPlugin.activeProviders.gameMonetize.service;
    }

    async testGameMonetizeOptionsAreSetBeforeItsScriptIsAppended()
    {
        await this.test('the GameMonetize SDK options are set before its preloaded script is appended', async () => {
            let gameManager = this.createGameMonetizeGameManager('game-1');
            this.preloadPlugin(gameManager);
            this.assert.deepStrictEqual(gameManager.appendedScripts.map(script => script.src), [
                'https://sdk.test/game-monetize.js'
            ]);
            this.assert.deepStrictEqual(gameManager.gameIdsOnAppend, ['game-1']);
        });
    }

    async testGameMonetizeEventsReachTheActivatedProvider()
    {
        await this.test('the SDK events of the preloaded GameMonetize script reach the provider of the activation', async () => {
            let gameManager = this.createGameMonetizeGameManager('game-1');
            let adsPlugin = this.preloadPlugin(gameManager);
            let gameMonetize = await this.activateProviders(adsPlugin, gameManager);
            this.assert.strictEqual(gameManager.appendedScripts.length, 1);
            await gameManager.window.SDK_OPTIONS.onEvent({name: 'CONTENT_PAUSE_REQUESTED'});
            this.assert.strictEqual(gameMonetize.isPlayingAd, true);
            await gameManager.window.SDK_OPTIONS.onEvent({name: 'SDK_GAME_START'});
            this.assert.strictEqual(gameMonetize.isPlayingAd, false);
            this.assert.deepStrictEqual(gameManager.muteStates, [[true, true], [false, false]]);
        });
    }

    async testGameMonetizeEventsReachOnlyTheLastActivatedProvider()
    {
        await this.test('a second activation moves the GameMonetize SDK events to its new provider', async () => {
            let gameManager = this.createGameMonetizeGameManager('game-1');
            let adsPlugin = this.preloadPlugin(gameManager);
            let firstProvider = await this.activateProviders(adsPlugin, gameManager);
            let lastProvider = await this.activateProviders(adsPlugin, gameManager);
            await gameManager.window.SDK_OPTIONS.onEvent({name: 'CONTENT_PAUSE_REQUESTED'});
            this.assert.notStrictEqual(firstProvider, lastProvider);
            this.assert.deepStrictEqual([firstProvider.isPlayingAd, lastProvider.isPlayingAd], [false, true]);
            this.assert.deepStrictEqual(gameManager.muteStates, [[true, true]]);
        });
    }

    async testGameMonetizeWithoutGameIdSetsNoOptions()
    {
        await this.test('a GameMonetize provider without game ID gets its script appended without SDK options', async () => {
            let gameManager = this.createGameMonetizeGameManager('');
            this.preloadPlugin(gameManager);
            this.assert.deepStrictEqual(gameManager.gameIdsOnAppend, [false]);
            this.assert.strictEqual(sc.hasOwn(gameManager.window, 'SDK_OPTIONS'), false);
        });
    }

    async testSdkNotRequiredNeverHidesTheLogin()
    {
        await this.test('an SDK not required that fails to load never hides the login', async () => {
            let gameManager = this.createGameManager({sdkRequired: false, providers: {
                providerOne: {enabled: 1, sdkUrl: 'https://sdk.test/one.js'}
            }});
            this.preloadPlugin(gameManager);
            this.assert.deepStrictEqual(gameManager.appendedScripts[0].listeners, {});
            this.assert.deepStrictEqual(gameManager.formsContainer.hiddenClasses, []);
        });
    }

}

module.exports.TestAdsSdkPreload = TestAdsSdkPreload;
