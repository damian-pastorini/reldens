/**
 *
 * Reldens - AdsPlugin
 *
 * Client-side ads plugin that manages ad providers, SDK initialization, and ad playback events.
 *
*/

const { MessagesListener } = require('./messages-listener');
const { SdkHandler } = require('./sdk-handler');
const { ProvidersList } = require('./providers-list');
const Translations = require('./snippets/en_US');
const { TranslationsMapper } = require('../../snippets/client/translations-mapper');
const { AdsConst } = require('../constants');
const { PluginInterface } = require('../../features/plugin-interface');
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
class AdsPlugin extends PluginInterface
{

    /**
     * @param {AdsPluginProps} props
     */
    setup(props)
    {
        /** @type {GameManager|false} */
        this.gameManager = sc.get(props, 'gameManager', false);
        if(!this.gameManager){
            Logger.error('Game Manager undefined in AdsPlugin.');
        }
        /** @type {EventsManager|false} */
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in AdsPlugin.');
        }
        /** @type {Object|false} */
        this.config = {};
        /** @type {Object<string, Object>} */
        this.activeProviders = {};
        /** @type {Object<string, Object>|null} */
        this.playedAds = null;
        this.setConfig();
        this.setSkdHandler();
        this.fetchActiveProviders();
        this.setTranslations();
        this.listenEvents();
    }

    setConfig()
    {
        this.config = this.gameManager ? this.gameManager.config.get('client/ads/general', {}) : false;
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
