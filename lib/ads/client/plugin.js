/**
 *
 * Reldens - AdsPlugin
 *
 * Client-side ads plugin that manages ad providers, SDK initialization, and ad playback events. It is preloaded with
 * the page (FeaturesManager.preloadFeatures), so the enabled providers SDK scripts of the initial client config are
 * appended before the login and loaded before the game starts. With client/ads/general/sdkRequired on, the login forms
 * stay hidden until those scripts load and the game can not start if any of them fails (RequiredSdkLoginGuard).
 *
*/

const { MessagesListener } = require('./messages-listener');
const { SdkHandler } = require('./sdk-handler');
const { RequiredSdkLoginGuard } = require('./required-sdk-login-guard');
const { ProvidersList } = require('./providers-list');
const Translations = require('./snippets/en_US');
const { TranslationsMapper } = require('../../snippets/client/translations-mapper');
const { AdsConst } = require('../constants');
const { ClientCorePlugin } = require('../../features/client/client-core-plugin');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../game/client/game-manager').GameManager} GameManager
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('./sdk-handler').SdkHandler} SdkHandler
 *
 * @typedef {Object} AdsPluginProps
 * @property {GameManager} [gameManager] - The game manager instance
 * @property {EventsManager} [events] - The events manager instance
 */
class AdsPlugin extends ClientCorePlugin
{

    constructor()
    {
        super();
        /** @type {Object|false} */
        this.config = {};
        /** @type {Object<string, Object>} */
        this.activeProviders = {};
        /** @type {Object<string, Object>|null} */
        this.playedAds = null;
        /** @type {SdkHandler|false} */
        this.sdkHandler = false;
        /** @type {RequiredSdkLoginGuard|false} */
        this.requiredSdkLoginGuard = false;
    }

    /**
     * @param {AdsPluginProps} props
     * @returns {boolean}
     */
    preload(props)
    {
        if(!this.setupCoreProperties(props)){
            return false;
        }
        this.loadProviders();
        if(!this.sdkHandler){
            return false;
        }
        let sdkScripts = this.sdkHandler.appendProvidersSdk(this.activeProviders);
        if(!this.gameManager.config.getWithoutLogs(AdsConst.CONFIG_PATHS.SDK_REQUIRED, false)){
            return true;
        }
        this.requiredSdkLoginGuard = new RequiredSdkLoginGuard({gameDom: this.gameManager.gameDom});
        this.requiredSdkLoginGuard.guard(sdkScripts);
        return true;
    }

    /**
     * @param {AdsPluginProps} props
     */
    setup(props)
    {
        if(!this.setupCoreProperties(props)){
            return false;
        }
        this.loadProviders();
        this.setTranslations();
        this.listenEvents();
    }

    loadProviders()
    {
        this.activeProviders = {};
        this.setConfig();
        if(!this.sdkHandler){
            this.setSkdHandler();
        }
        this.fetchActiveProviders();
    }

    setConfig()
    {
        this.config = this.gameManager ? this.gameManager.config.getWithoutLogs('client/ads/general', {}) : false;
    }

    setSkdHandler()
    {
        let gameDom = this.gameManager?.gameDom;
        /** @type {SdkHandler|false} */
        this.sdkHandler = gameDom ? new SdkHandler({gameDom, config: this.config}) : false;
    }

    /**
     * @returns {boolean}
     */
    fetchActiveProviders()
    {
        let providers = sc.get(this.config, 'providers', {});
        let providersKeys = Object.keys(providers);
        if(0 === providersKeys.length){
            //Logger.debug('None ads providers configured.', this.config);
            return false;
        }
        for(let i of providersKeys){
            let provider = providers[i];
            if(!provider.enabled){
                //Logger.debug({'Provider disabled': providers});
                continue;
            }
            provider.classDefinition = sc.get(ProvidersList, i, false);
            this.activeProviders[i] = provider;
        }
    }

    /**
     * @returns {boolean}
     */
    setTranslations()
    {
        if(!this.gameManager){
            return false;
        }
        TranslationsMapper.forConfig(this.gameManager.config.client, Translations, AdsConst.MESSAGE.DATA_VALUES);
    }

    /**
     * @returns {boolean}
     */
    listenEvents()
    {
        if(!this.events || !this.gameManager || !this.sdkHandler){
            Logger.error('Missing properties for AdsPlugin.');
            return false;
        }
        this.events.on('reldens.beforeCreateEngine', async (initialGameData, gameManager) => {
            if(!this.sdkHandler){
                Logger.info('Undefined SDK Handler.');
                return;
            }
            await this.sdkHandler.setupProvidersSdk(this.activeProviders, gameManager);
        });
        this.events.on('reldens.joinedRoom', async (room) => {
            await MessagesListener.listenMessages(room, this);
        });
    }

}

module.exports.AdsPlugin = AdsPlugin;
