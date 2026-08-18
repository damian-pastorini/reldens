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
const { PluginInterface } = require('../../features/plugin-interface');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../game/client/game-manager').GameManager} GameManager
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 */
class RoomsPlugin extends PluginInterface
{

    constructor()
    {
        super();
        /** @type {GameManager|boolean} */
        this.gameManager = false;
        /** @type {EventsManager|boolean} */
        this.events = false;
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
        this.gameManager = sc.get(props, 'gameManager', false);
        if(!this.gameManager){
            Logger.error('Game Manager not provided in RoomsPlugin.');
        }
        this.events = sc.get(props, 'events', false);
        if(this.gameManager){
            this.gameManager.config.client.message.listeners[RoomsConst.MESSAGE_LISTENER_KEY]
                = new RoomsMessageListener();
        }
        return this.listenEvents();
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
            let isRoomSelectionDisabled = gameManager.config.get('client/rooms/selection/allowOnLogin', false);
            if(isRoomSelectionDisabled && initialGameData.roomSelection){
                this.sceneSelectorBuilder.populate(initialGameData.roomSelection, gameManager);
            }
        });
        this.events.on('reldens.onPrepareSinglePlayerSelectorFormSubmit', (event) => {
            this.selectedSceneAppender.append(event.gameManager, event.form);
        });
        this.events.on('reldens.onPreparePlayerSelectorFormSubmit', (event) => {
            this.selectedSceneAppender.append(event.gameManager, event.form);
        });
        this.events.on('reldens.onPreparePlayerCreationFormSubmit', (event) => {
            this.selectedSceneAppender.append(event.gameManager, event.form);
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
