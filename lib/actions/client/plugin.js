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
const { Logger, sc } = require('@reldens/utils');

class ActionsPlugin extends PluginInterface
{

    setup(props)
    {
        this.gameManager = sc.get(props, 'gameManager', false);
        if(!this.gameManager){
            Logger.error('Game Manager undefined in ActionsPlugin.');
        }
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in ActionsPlugin.');
        }
        this.playerSelector = new PlayerSelector(props);
        this.preloaderHandler = new PreloaderHandler(props);
        this.messagesHandler = new MessagesHandler(props);
        this.listenEvents();
    }

    listenEvents()
    {
        this.events.on('reldens.preloadUiScene', (uiSceneManager) => {
            this.preloaderHandler.loadContents(uiSceneManager.uiSceneDriver, uiSceneManager.playerSpriteSize);
        });
        this.events.on('reldens.createPreload', (preloadScene) => {
            this.preloaderHandler.createAnimations(preloadScene);
        });
        this.events.on('reldens.createUiScene', (uiSceneManager) => {
            this.uiManager = new SkillsUi(uiSceneManager);
            this.uiManager.createUi();
        });
        this.events.on('reldens.beforeCreateEngine', (initialGameData) => {
            let classesData = sc.get(initialGameData, 'classesData', {});
            if(0 === Object.keys(classesData).length){
                return false;
            }
            this.playerSelector.populateClassesSelector(
                classesData,
                initialGameData.gameConfig.client.players,
                initialGameData.player
            );
        });
        this.events.on('reldens.activateRoom', (room) => {
            // listen to room messages:
            room.onMessage('*', (message) => {
                this.messagesHandler.processOrQueueMessage(message);
            });
        });
        this.events.on('reldens.playersOnAddReady', (props) => {
            let {player, roomEvents} = props;
            this.messagesHandler.createAndActivateReceiver(player, player.playerId, roomEvents);
        });
    }

}

module.exports.ActionsPlugin = ActionsPlugin;
