/**
 *
 * Reldens - Actions Client Plugin.
 *
 */

const { SkillsUi } = require('./skills-ui');
const { PluginInterface } = require('../../features/plugin-interface');
const { PlayerSelector } = require('./player-selector');
const { PreloaderHandler } = require('./preloader-handler');
const { MessagesHandler } = require('./messages-handler');
const Translations = require('./snippets/en_US');
const { TranslationsMapper } = require('../../snippets/client/translations-mapper');
const { Logger, sc } = require('@reldens/utils');

class ActionsPlugin extends PluginInterface
{

    setup(props)
    {
        this.gameManager = sc.get(props, 'gameManager', false);
        if(!this.gameManager){
            Logger.error('Game Manager undefined in ActionsPlugin.');
            return false;
        }
        TranslationsMapper.forConfig(this.gameManager.config.client, Translations);
        this.playerSelector = new PlayerSelector(props);
        this.preloaderHandler = new PreloaderHandler(props);
        this.messagesHandler = new MessagesHandler(props);
        this.events = sc.get(props, 'events', false);
        this.listenEvents();
    }

    listenEvents()
    {
        if(!this.events){
            Logger.error('EventsManager undefined in ActionsPlugin.');
            return false;
        }
        this.events.on('reldens.preloadUiScene', (uiScene) => {
            this.preloaderHandler.loadContents(uiScene);
        });
        this.events.on('reldens.createPreload', (preloadScene) => {
            this.preloaderHandler.createAnimations(preloadScene);
        });
        this.events.on('reldens.createUiScene', (preloadScene) => {
            this.uiManager = new SkillsUi(preloadScene);
            this.uiManager.createUi();
        });
        this.events.on('reldens.beforeCreateEngine', (initialGameData) => {
            this.playerSelector.populateClassesSelector(
                sc.get(initialGameData, 'classesData', {}),
                initialGameData.gameConfig.client.players,
                initialGameData.player
            );
        });
        this.events.on('reldens.activateRoom', (room) => {
            room.onMessage('*', (message) => {
                this.messagesHandler.processOrQueueMessage(message);
            });
        });
        this.events.on('reldens.playersOnAddReady', (props) => {
            this.messagesHandler.createAndActivateReceiver(props.player, props.roomEvents);
        });
    }

}

module.exports.ActionsPlugin = ActionsPlugin;
