/**
 *
 * Reldens - Scores Client Plugin
 *
 */

const { PreloaderHandler } = require('./preloader-handler');
const { ScoresMessageListener } = require('./scores-message-listener');
const { MessageProcessor } = require('./messages-processor');
const { ScoresConst } = require('../constants');
const Translations = require('./snippets/en_US');
const { TranslationsMapper } = require('../../snippets/client/translations-mapper');
const { PluginInterface } = require('../../features/plugin-interface');
const { Logger, sc } = require('@reldens/utils');

class ScoresPlugin extends PluginInterface
{

    setup(props)
    {
        this.gameManager = sc.get(props, 'gameManager', false);
        this.events = sc.get(props, 'events', false);
        this.preloaderHandler = new PreloaderHandler();
        this.scoresMessageListener = new ScoresMessageListener();
        if(this.validateProperties()){
            this.setTranslations();
            this.listenEvents();
            this.listenMessages();
            //Logger.debug('Plugin READY: Scores');
        }
    }

    validateProperties()
    {
        if(!this.gameManager){
            Logger.error('Game Manager undefined in ScoresPlugin.');
            return false;
        }
        if(!this.events){
            Logger.error('EventsManager undefined in ScoresPlugin.');
            return false;
        }
        return true;
    }

    setTranslations()
    {
        if(!this.gameManager){
            return false;
        }
        TranslationsMapper.forConfig(this.gameManager.config.client, Translations, ScoresConst.MESSAGE.DATA_VALUES);
    }

    listenEvents()
    {
        if(!this.events){
            Logger.error('EventsManager undefined in ScoresPlugin for "listenEvents".');
            return;
        }
        this.events.on('reldens.preloadUiScene', (preloadScene) => {
            this.preloaderHandler.loadContents(preloadScene);
        });
        this.events.on('reldens.createEngineSceneDone', (event) => {
            let roomEvents = event?.roomEvents;
            if(!roomEvents){
                Logger.critical('RoomEvents undefined for process Scores messages queue on ScoresPlugin.', event);
                return false;
            }
            MessageProcessor.processScoresMessagesQueue(roomEvents, this.scoresMessageListener);
        });
    }

    listenMessages()
    {
        if(!this.gameManager || !this.events){
            Logger.error('Game Manager or EventsManager undefined in ScoresPlugin for "listenMessages".');
            return;
        }
        this.gameManager.config.client.message.listeners[ScoresConst.KEY] = this.scoresMessageListener;
    }

}

module.exports.ScoresPlugin = ScoresPlugin;
