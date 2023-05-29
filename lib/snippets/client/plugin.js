/**
 *
 * Reldens - Snippets Client Plugin
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

class SnippetsPlugin extends PluginInterface
{

    setup(props)
    {
        this.gameManager = sc.get(props, 'gameManager', false);
        if(!this.gameManager){
            Logger.error('Game Manager undefined in InventoryPlugin.');
        }
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in InventoryPlugin.');
        }
        TranslationsMapper.forConfig(this.gameManager.config.client, Translations);
        this.activeLocale = '' !== this.gameManager.locale ? this.gameManager.locale : SnippetsConst.DEFAULT_LOCALE;
        this.gameManager.translator = new Translator({
            snippets: Object.assign({}, this.gameManager.config.client.snippets),
            locale: SnippetsConst.DEFAULT_LOCALE,
            activeLocale: this.activeLocale,
        });
        this.listenEvents();
    }

    listenEvents()
    {
        if(!this.events){
            return false;
        }
        this.events.on('reldens.startEngineScene', async (roomEvents, player, room, previousScene) => {
            // re-assign the snippets after all the plugins added their own sets (search TranslationsMapper.forConfig)
            let snippets = Object.assign({}, this.gameManager.config.client.snippets);
            this.gameManager.translator = new Translator({
                snippets,
                locale: SnippetsConst.DEFAULT_LOCALE,
                activeLocale: player.locale || this.activeLocale,
            });
        });
        this.events.on('reldens.preloadUiScene', (preloadScene) => {
            TemplatesHandler.preloadTemplates(preloadScene);
        });
        this.events.on('reldens.createUiScene', (preloadScene) => {
            this.uiManager = new SnippetsUi(preloadScene);
            this.uiManager.createUi();
        });
    }

}

module.exports.SnippetsPlugin = SnippetsPlugin;
