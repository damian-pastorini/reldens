/**
 *
 * Reldens - Snippets Client Plugin
 *
 * Initializes the client-side snippets system with translations and locale management.
 *
 */

const { Translator } = require('../translator');
const { SnippetsUi } = require('./snippets-ui');
const { TemplatesHandler } = require('./templates-handler');
const { TranslationsMapper } = require('./translations-mapper');
const Translations = require('./snippets/en_US');
const { SnippetsConst } = require('../constants');
const { PluginInterface } = require('../../features/plugin-interface');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('../../game/client/game-manager').GameManager} GameManager
 *
 * @typedef {Object} SnippetsPluginProps
 * @property {GameManager} gameManager
 * @property {EventsManager} events
 */
class SnippetsPlugin extends PluginInterface
{

    /**
     * @param {SnippetsPluginProps} props
     * @returns {Promise<boolean>}
     */
    async setup(props)
    {
        /** @type {GameManager|boolean} */
        this.gameManager = sc.get(props, 'gameManager', false);
        if(!this.gameManager){
            Logger.error('Game Manager undefined in InventoryPlugin.');
            return false;
        }
        /** @type {EventsManager|boolean} */
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in InventoryPlugin.');
        }
        TranslationsMapper.forConfig(this.gameManager.config.client, Translations);
        /** @type {string} */
        this.activeLocale = this.gameManager.initialGameData?.userLocale?.locale.locale || SnippetsConst.DEFAULT_LOCALE;
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
            this.uiManager = new SnippetsUi(preloadScene);
            this.uiManager.createUi();
        });
        return true
    }

}

module.exports.SnippetsPlugin = SnippetsPlugin;
