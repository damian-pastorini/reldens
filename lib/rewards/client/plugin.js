/**
 *
 * Reldens - Rewards Client Plugin
 *
 */

const { PreloaderHandler } = require('./preloader-handler');
const { MessageListener } = require('./message-listener');
const { MessageProcessor } = require('./messages-processor');
const { RewardsConst } = require('../constants');
const Translations = require('./snippets/en_US');
const { TranslationsMapper } = require('../../snippets/client/translations-mapper');
const { PluginInterface } = require('../../features/plugin-interface');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('../../game/client/game-manager').GameManager} GameManager
 */
class RewardsPlugin extends PluginInterface
{

    async setup(props)
    {
        /** @type {GameManager|boolean} */
        this.gameManager = sc.get(props, 'gameManager', false);
        /** @type {EventsManager|boolean} */
        this.events = sc.get(props, 'events', false);
        this.preloaderHandler = new PreloaderHandler();
        this.messageListener = new MessageListener();
        if(this.validateProperties()){
            this.setTranslations();
            this.listenEvents();
            this.listenMessages();
            Logger.debug('Plugin READY: Rewards');
        }
    }

    validateProperties()
    {
        if(!this.gameManager){
            Logger.error('Game Manager undefined in RewardsPlugin.');
            return false;
        }
        if(!this.events){
            Logger.error('EventsManager undefined in RewardsPlugin.');
            return false;
        }
        return true;
    }

    setTranslations()
    {
        if(!this.gameManager){
            return false;
        }
        TranslationsMapper.forConfig(this.gameManager.config.client, Translations, RewardsConst.MESSAGE.DATA_VALUES);
    }

    listenEvents()
    {
        if(!this.events){
            Logger.error('EventsManager undefined in RewardsPlugin for "listenEvents".');
            return;
        }
        this.events.on('reldens.preloadUiScene', (preloadScene) => {
            this.preloaderHandler.loadContents(preloadScene);
        });
        this.events.on('reldens.createEngineSceneDone', (event) => {
            MessageProcessor.processRewardsMessagesQueue(event, this);
        });
    }

    listenMessages()
    {
        if(!this.gameManager || !this.events){
            Logger.error('Game Manager or EventsManager undefined in RewardsPlugin for "listenMessages".');
            return;
        }
        this.gameManager.config.client.message.listeners[RewardsConst.KEY] = this.messageListener;
    }

}

module.exports.RewardsPlugin = RewardsPlugin;
