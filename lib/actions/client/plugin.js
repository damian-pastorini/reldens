/**
 *
 * Reldens - ActionsPlugin
 *
 * Client-side plugin for managing actions, skills, and class paths.
 *
 */

const { SkillsUi } = require('./skills-ui');
const { ClientCorePlugin } = require('../../features/client/client-core-plugin');
const { PlayerSelector } = require('./player-selector');
const { PreloaderHandler } = require('./preloader-handler');
const { MessagesHandler } = require('./messages-handler');
const { GameManagerEnricher } = require('./game-manager-enricher');
const { GameOverReviveMessage } = require('./game-over-revive-message');
const Translations = require('./snippets/en_US');
const { TranslationsMapper } = require('../../snippets/client/translations-mapper');
const { ActionsConst } = require('../constants');
const { sc } = require('@reldens/utils');

/**
 * @typedef {import('../../game/client/game-manager').GameManager} GameManager
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 */
class ActionsPlugin extends ClientCorePlugin
{

    constructor()
    {
        super();
        /** @type {PlayerSelector|boolean} */
        this.playerSelector = false;
        /** @type {PreloaderHandler|boolean} */
        this.preloaderHandler = false;
        /** @type {GameOverReviveMessage|boolean} */
        this.gameOverReviveMessage = false;
        /** @type {SkillsUi|boolean} */
        this.uiManager = false;
    }

    /**
     * @param {Object} props
     * @returns {boolean}
     */
    setup(props)
    {
        if(!this.setupCoreProperties(props)){
            return false;
        }
        this.playerSelector = new PlayerSelector(props);
        this.preloaderHandler = new PreloaderHandler(props);
        this.gameOverReviveMessage = new GameOverReviveMessage({gameManager: this.gameManager, events: this.events});
        TranslationsMapper.forConfig(this.gameManager.config.client, Translations, ActionsConst.MESSAGE.DATA_VALUES);
        this.listenEvents();
        return true;
    }

    listenEvents()
    {
        this.events.on('reldens.preloadUiScene', (uiScene) => {
            this.preloaderHandler.loadContents(uiScene);
        });
        this.events.on('reldens.createPreload', (preloadScene) => {
            this.preloaderHandler.createAnimations(preloadScene);
        });
        this.events.on('reldens.createUiScene', (uiScene) => {
            this.uiManager = new SkillsUi(uiScene);
            this.uiManager.createUi();
            this.gameOverReviveMessage.prepareTemplate(uiScene);
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
                MessagesHandler.processOrQueueMessage(message, this.gameManager);
            });
            this.gameOverReviveMessage.listenRoomMessages(room);
        });
        this.events.on('reldens.playersOnAddReady', (props) => {
            GameManagerEnricher.withReceiver(props.player, props.roomEvents, this.gameManager);
        });
    }

}

module.exports.ActionsPlugin = ActionsPlugin;
