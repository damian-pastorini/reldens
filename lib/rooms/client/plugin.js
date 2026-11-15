/**
 *
 * Reldens - RoomsPlugin
 *
 * Client-side plugin for managing room selection and scene selector UI.
 *
 */

const { RoomsConst } = require('../constants');
const { RoomsMessageListener } = require('./rooms-message-listener');
const { SceneSelectorBuilder } = require('./scene-selector-builder');
const { SceneSelectorRoomRemover } = require('./scene-selector-room-remover');
const { SelectedSceneAppender } = require('./selected-scene-appender');
const { ClientCorePlugin } = require('../../features/client/client-core-plugin');
const { Logger } = require('@reldens/utils');

/**
 * @typedef {import('../../game/client/game-manager').GameManager} GameManager
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 */
class RoomsPlugin extends ClientCorePlugin
{

    constructor()
    {
        super();
        /** @type {GameManager|boolean} */
        this.gameManager = false;
        /** @type {EventsManager|boolean} */
        this.events = false;
        /** @type {Object|boolean} */
        this.config = false;
        /** @type {boolean} */
        this.loginSelectionEnabled = false;
        /** @type {SceneSelectorBuilder} */
        this.sceneSelectorBuilder = new SceneSelectorBuilder();
        /** @type {SceneSelectorRoomRemover} */
        this.sceneSelectorRoomRemover = new SceneSelectorRoomRemover();
        /** @type {SelectedSceneAppender} */
        this.selectedSceneAppender = new SelectedSceneAppender();
    }

    /**
     * @param {Object} props
     * @returns {Promise<boolean>}
     */
    async setup(props)
    {
        if(!this.setupCoreProperties(props)){
            return false;
        }
        this.gameManager.config.client.message.listeners[RoomsConst.MESSAGE_LISTENER_KEY] = new RoomsMessageListener();
        this.loadConfig();
        return this.listenEvents();
    }

    /**
     * @returns {boolean}
     */
    loadConfig()
    {
        this.config = this.gameManager.config;
        if(!this.config){
            Logger.error('Config not provided in RoomsPlugin.');
            return false;
        }
        this.loginSelectionEnabled = this.config.get('client/rooms/selection/allowOnLogin', false);
        return true;
    }

    /**
     * @returns {boolean}
     */
    listenEvents()
    {
        if(!this.events){
            Logger.error('EventsManager not provided in RoomsPlugin.');
            return false;
        }
        this.events.on('reldens.beforeCreateEngine', (initialGameData, gameManager) => {
            if(!initialGameData.roomSelection){
                return;
            }
            this.sceneSelectorBuilder.populate(initialGameData.roomSelection, gameManager, this.loginSelectionEnabled);
        });
        this.events.on('reldens.onPrepareSinglePlayerSelectorFormSubmit', (event) => {
            this.selectedSceneAppender.append(event.gameManager, event.form);
        });
        this.events.on('reldens.onPreparePlayerSelectorFormSubmit', (event) => {
            this.selectedSceneAppender.append(event.gameManager, event.form);
        });
        this.events.on('reldens.onPreparePlayerCreationFormSubmit', (event) => {
            this.selectedSceneAppender.append(event.gameManager, event.form, event.serializedForm);
        });
        this.events.on('reldens.gameRoomMessage', (message, gameManager) => {
            if(RoomsConst.ROOM_REMOVED !== message.act){
                return;
            }
            this.sceneSelectorRoomRemover.remove(message.roomName, gameManager);
        });
        return true;
    }

}

module.exports.RoomsPlugin = RoomsPlugin;
