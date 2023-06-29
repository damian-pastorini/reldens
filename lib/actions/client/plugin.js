/**
 *
 * Reldens - ActionsPlugin
 *
 */

const { SkillsUi } = require('./skills-ui');
const { PluginInterface } = require('../../features/plugin-interface');
const { PlayerSelector } = require('./player-selector');
const { PreloaderHandler } = require('./preloader-handler');
const { MessagesHandler } = require('./messages-handler');
const { GameManagerEnricher } = require('./game-manager-enricher');
const Translations = require('./snippets/en_US');
const { TranslationsMapper } = require('../../snippets/client/translations-mapper');
const { ActionsConst } = require('../constants');
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
        if(!this.events || !this.gameManager){
            Logger.error('EventsManager undefined in ActionsPlugin.');
        }
        this.playerSelector = new PlayerSelector(props);
        this.preloaderHandler = new PreloaderHandler(props);
        this.setTranslations();
        this.listenEvents();
    }

    setTranslations()
    {
        if(!this.events || !this.gameManager){
            return false;
        }
        TranslationsMapper.forConfig(this.gameManager.config.client, Translations, ActionsConst.MESSAGE.DATA_VALUES);
    }

    listenEvents()
    {
        if(!this.events || !this.gameManager){
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
                MessagesHandler.processOrQueueMessage(message, this.gameManager);
            });
        });
        this.events.on('reldens.playersOnAddReady', (props) => {
            GameManagerEnricher.withReceiver(props.player, props.roomEvents, this.gameManager);
        });
    }

}

module.exports.ActionsPlugin = ActionsPlugin;
