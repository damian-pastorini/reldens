/**
 *
 * Reldens - Chat Client Plugin
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

class ChatPlugin extends PluginInterface
{

    setup(props)
    {
        this.gameManager = sc.get(props, 'gameManager', false);
        if(!this.gameManager){
            Logger.error('Game Manager undefined in ActionsPlugin.');
        }
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in ChatPlugin.');
        }
        this.messagesQueu = [];
        this.uiManager = false;
        this.joinRooms = [ChatConst.CHAT_GLOBAL];
        this.setTranslations();
        this.listenEvents();
    }

    setTranslations()
    {
        if(!this.gameManager){
            return false;
        }
        TranslationsMapper.forConfig(this.gameManager.config.client, Translations, ChatConst.MESSAGE.DATA_VALUES);
    }

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
