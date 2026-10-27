/**
 *
 * Reldens - Snippets Client Plugin
 *
 * Initializes the client-side snippets system with translations and locale management.
 *
 */

const { Translator } = require('../translator');
const { SnippetsUi } = require('./snippets-ui');
const { LanguageSaveErrorListener } = require('./language-save-error-listener');
const { TemplatesHandler } = require('./templates-handler');
const { TranslationsMapper } = require('./translations-mapper');
const Translations = require('./snippets/en_US');
const { SnippetsConst } = require('../constants');
const { ClientCorePlugin } = require('../../features/client/client-core-plugin');
const { sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('../../game/client/game-manager').GameManager} GameManager
 *
 * @typedef {Object} SnippetsPluginProps
 * @property {GameManager} gameManager
 * @property {EventsManager} events
 */
class SnippetsPlugin extends ClientCorePlugin
{

    constructor()
    {
        super();
        /** @type {Object} */
        this.availableLocales = {};
        /** @type {SnippetsUi|boolean} */
        this.uiManager = false;
    }

    /**
     * @param {SnippetsPluginProps} props
     * @returns {Promise<boolean>}
     */
    async setup(props)
    {
        if(!this.setupCoreProperties(props)){
            return false;
        }
        TranslationsMapper.forConfig(this.gameManager.config.client, Translations);
        /** @type {string} */
        this.activeLocale = this.gameManager.initialGameData?.userLocale?.locale || SnippetsConst.DEFAULT_LOCALE;
        this.gameManager.services.translator = new Translator({
            snippets: Object.assign({}, this.gameManager.config.client.snippets),
            dataValues: Object.assign({}, this.gameManager.config.client.snippetsDataValues),
            locale: SnippetsConst.DEFAULT_LOCALE,
            activeLocale: this.activeLocale
        });
        return this.listenEvents();
    }

    /**
     * @returns {boolean}
     */
    listenEvents()
    {
        if(!this.events){
            return false;
        }
        this.events.on('reldens.beforeCreateEngine', () => {
            this.availableLocales = this.fetchAvailableLocales();
        });
        this.events.on('reldens.startEngineScene', async (roomEvents, player, room, previousScene) => {
            // @TODO - BETA - Test for possible differences.
            // re-assign the snippets after all the plugins added their own sets (search TranslationsMapper.forConfig)
            this.gameManager.services.translator.snippets = Object.assign(
                this.gameManager.services.translator.snippets,
                this.gameManager.config.client.snippets
            );
        });
        this.events.on('reldens.preloadUiScene', (preloadScene) => {
            TemplatesHandler.preloadTemplates(preloadScene);
        });
        this.events.on('reldens.createUiScene', (preloadScene) => {
            /** @type {SnippetsUi} */
            this.uiManager = new SnippetsUi(preloadScene, this.availableLocales);
            this.uiManager.createUi();
            this.gameManager.config.client.message.listeners[SnippetsConst.KEY] = new LanguageSaveErrorListener(
                this.uiManager
            );
        });
        return true
    }

    /**
     * @returns {Object}
     */
    fetchAvailableLocales()
    {
        let configuredLocales = sc.get(this.gameManager.config.client, 'locales', {});
        let snippets = sc.get(this.gameManager.config.client, 'snippets', {});
        let availableLocales = {};
        for(let i of Object.keys(configuredLocales)){
            if(0 === Object.keys(sc.get(snippets, configuredLocales[i].locale, {})).length){
                continue;
            }
            availableLocales[i] = configuredLocales[i];
        }
        return availableLocales;
    }

}

module.exports.SnippetsPlugin = SnippetsPlugin;
