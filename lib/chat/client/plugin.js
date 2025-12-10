/**
 *
 * Reldens - Chat Client Plugin
 *
 * Initializes and manages the chat system on the client side.
 *
 */

const { ChatUi } = require('./chat-ui');
const { MessagesListener } = require('./messages-listener');
const { TemplatesHandler } = require('./templates-handler');
const Translations = require('./snippets/en_US');
const { TranslationsMapper } = require('../../snippets/client/translations-mapper');
const { PluginInterface } = require('../../features/plugin-interface');
const { ChatConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManagerSingleton} EventsManagerSingleton
 * @typedef {import('../../game/client/game-manager').GameManager} GameManager
 */
class ChatPlugin extends PluginInterface
{

    /**
     * @param {Object} props
     * @param {GameManager} [props.gameManager]
     * @param {EventsManagerSingleton} [props.events]
     */
    async setup(props)
    {
        /** @type {GameManager|boolean} */
        this.gameManager = sc.get(props, 'gameManager', false);
        if(!this.gameManager){
            Logger.error('Game Manager undefined in ActionsPlugin.');
        }
        /** @type {EventsManagerSingleton|boolean} */
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in ChatPlugin.');
        }
        /** @type {Array<Object>} */
        this.messagesQueu = [];
        /** @type {ChatUi|boolean} */
        this.uiManager = false;
        /** @type {Array<string>} */
        this.joinRooms = [ChatConst.CHAT_GLOBAL];
        this.setTranslations();
        this.listenEvents();
    }

    /**
     * @returns {boolean}
     */
    setTranslations()
    {
        if(!this.gameManager){
            return false;
        }
        TranslationsMapper.forConfig(this.gameManager.config.client, Translations, ChatConst.MESSAGE.DATA_VALUES);
    }

    /**
     * @returns {boolean}
     */
    listenEvents()
    {
        if(!this.events){
            return false;
        }
        // chat messages are global for all rooms, so we use the generic event for every joined room:
        this.events.on('reldens.joinedRoom', async (room) => {
            await MessagesListener.listenMessages(room, this);
        });
        this.events.on('reldens.preloadUiScene', (preloadScene) => {
            TemplatesHandler.preloadTemplates(preloadScene, this.gameManager.config.get('client/ui/chat/showTabs'));
        });
        this.events.on('reldens.createUiScene', (uiScene) => {
            this.uiManager = new ChatUi(uiScene);
            this.uiManager.createUi();
            this.uiManager.createTabs();
            this.uiManager.processMessagesQueue(this.messagesQueu);
        });
    }

}

module.exports.ChatPlugin = ChatPlugin;
