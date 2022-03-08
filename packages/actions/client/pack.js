/**
 *
 * Reldens - Actions Client Package.
 *
 */

const { SkillsUi } = require('./skills-ui');
const { PackInterface } = require('../../features/pack-interface');
const { PlayerSelector } = require('./player-selector');
const { PreloaderHandler } = require('./preloader-handler');
const { MessagesHandler } = require('./messages-handler');
const { Logger, sc } = require('@reldens/utils');

class ActionsPack extends PackInterface
{

    setupPack(props)
    {
        this.gameManager = sc.get(props, 'gameManager', false);
        if(!this.gameManager){
            Logger.error('Game Manager undefined in ActionsPack.');
        }
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in ActionsPack.');
        }
        this.playerSelector = new PlayerSelector(props);
        this.preloaderHandler = new PreloaderHandler(props);
        this.messagesHandler = new MessagesHandler(props);
        this.listenEvents();
    }

    listenEvents()
    {
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
            room.onMessage((message) => {
                this.messagesHandler.processOrQueueMessage(message);
            });
        });
        this.events.on('reldens.playersOnAddReady', (player, key, previousScene, roomEvents) => {
            this.messagesHandler.createAndActivateReceiver(player, key, roomEvents);
        });
    }

}

module.exports.ActionsPack = ActionsPack;
