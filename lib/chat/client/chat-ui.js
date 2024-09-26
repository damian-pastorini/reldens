/**
 *
 * Reldens - ChatUi
 *
 */

const { Input } = require('phaser');
const { SpriteTextFactory } = require('../../game/client/engine/sprite-text-factory');
const { ChatTabs } = require('./chat-tabs');
const { ChatConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

class ChatUi
{

    constructor(uiScene)
    {
        this.uiScene = uiScene;
        this.gameManager = this.uiScene?.gameManager;
        this.gameDom = this.uiScene?.gameManager?.gameDom;
        this.setChatTypes();
        this.setChatConfiguration();
        this.uiChat = {};
        this.messagesQueu = [];
        this.chatInput = false;
        this.chatSendButton = false;
        this.chatCloseButton = false;
        this.chatOpenButton = false;
    }

    setChatConfiguration()
    {
        if(!this.gameManager || !this.gameManager.config){
            return false;
        }
        this.uiConfig = this.gameManager.config.get('client/ui/chat');
        this.overheadChat = sc.get(this.uiConfig, 'overheadChat', {});
        this.overHeadChatEnabled = sc.get(this.overheadChat, 'enabled', false);
        this.overheadText = sc.get(this.uiConfig, 'overheadText', {});
        this.isDefaultOpen = sc.get(this.uiConfig, 'defaultOpen', false);
        this.isTyping = sc.get(this.overheadChat, 'isTyping', false);
        this.showTabs = sc.get(this.uiConfig, 'showTabs', false);
        this.closeChatBoxAfterSend = sc.get(this.closeChatBoxAfterSend, 'isTyping', false);
        this.messagesConfig = this.gameManager.config.get('client/chat/messages');
        this.characterLimit = sc.get(this.messagesConfig, 'characterLimit', 0);
        this.characterLimitOverhead = sc.get(this.messagesConfig, 'characterLimitOverhead', 0);
        this.appendErrorTypeOnActiveTab = sc.get(this.messagesConfig, 'appendErrorTypeOnActiveTab', true);
    }

    setChatTypes()
    {
        if(!this.gameManager){
            Logger.warning('Missing GameManager on ChatUI.');
            return false;
        }
        if(!this.gameDom){
            Logger.warning('Missing GameDom on ChatUI.');
            return false;
        }
        if(!this.gameManager.initialGameData){
            Logger.warning('Missing "initialGameData" on ChatUI.');
            return false;
        }
        this.chatTypes = sc.get(this.gameManager.initialGameData, 'chatTypes', []);
        if(0 === this.chatTypes.length){
            return false;
        }
        this.chatTypesById = {};
        for(let chatType of this.chatTypes){
            this.chatTypesById[chatType.id] = chatType;
        }
    }

    createUi()
    {
        if(!this.uiScene){
            Logger.warning('Missing UI Scene on ChatUI.');
            return false;
        }
        // @TODO - BETA - Replace by UserInterface.
        let {uiX, uiY} = this.uiScene.getUiConfig('chat');
        this.uiChat = this.uiScene.add.dom(uiX, uiY).createFromCache('chat');
        this.uiScene.elementsUi['chat'] = this.uiChat;
        this.chatInput = this.uiChat.getChildByProperty('id', ChatConst.CHAT_INPUT);
        if(!this.chatInput){
            Logger.info('Missing chat input on ChatUI.');
            return false;
        }
        this.setupKeyPressBehaviors();
        this.chatInput.addEventListener('onfocusout', () => {
            this.hideIsTyping();
        });
        this.setupSendButton();
        this.setupOpenCloseButtons();
        if(this.overHeadChatEnabled){
            this.setupOverheadChatEvents();
        }
        if(this.isDefaultOpen){
            this.showChatBox();
        }
    }

    createTabs()
    {
        if(!this.showTabs){
            return false;
        }
        this.tabs = new ChatTabs(this.gameManager, this.uiScene);
        return true;
    }

    setupOverheadChatEvents()
    {
        this.gameManager.events.on('reldens.runPlayerAnimation', (playerEngine, playerId, playerState, playerSprite) => {
            this.updateOverheadTextPosition(playerSprite);
        });
    }

    setupOpenCloseButtons()
    {
        this.chatOpenButton = this.uiChat.getChildByProperty('id', ChatConst.CHAT_OPEN_BUTTON);
        this.chatOpenButton?.addEventListener('click', () => {
            this.showChatBox();
            this.gameManager.events.emit(
                'reldens.openUI',
                {
                    ui: this,
                    openButton: this.chatOpenButton,
                    dialogBox: this.uiChat,
                    dialogContainer: this.uiChat.getChildByProperty('id', ChatConst.CHAT_UI),
                    uiScene: this.uiScene
                }
            );
        });
        this.chatCloseButton = this.uiChat.getChildByProperty('id', ChatConst.CHAT_CLOSE_BUTTON);
        this.chatCloseButton?.addEventListener('click', () => {
            this.hideChatBox();
            this.gameManager.events.emit(
                'reldens.closeUI',
                {
                    ui: this,
                    closeButton: this.chatCloseButton,
                    openButton: this.chatOpenButton,
                    dialogBox: this.uiChat,
                    dialogContainer: this.uiChat.getChildByProperty('id', ChatConst.CHAT_UI),
                    uiScene: this.uiScene
                }
            );
        });
    }

    setupSendButton()
    {
        this.chatSendButton = this.uiChat.getChildByProperty('id', ChatConst.CHAT_SEND_BUTTON);
        this.chatSendButton?.addEventListener('click', (event) => {
            event.preventDefault();
            this.sendChatMessage(this.chatInput, this.gameManager.activeRoomEvents);
            this.chatInput.focus();
        });
    }

    setupKeyPressBehaviors()
    {
        this.uiScene.input.keyboard.on('keyup-ENTER', () => {
            if(!this.isFocussedOnChatInput()){
                this.showChatBox();
                this.chatInput.focus();
            }
        });
        this.chatInput.addEventListener('keyup', (event) => {
            if(event.keyCode === Input.Keyboard.KeyCodes.ENTER){
                event.preventDefault();
                this.sendChatMessage();
                return;
            }
            this.showIsTyping();
        });
    }

    showOverheadChat(playerSprite, message)
    {
        if(!this.overHeadChatEnabled){
            return false;
        }
        if(playerSprite['overheadTextSprite']){
            this.destroyTextSprite(playerSprite);
        }
        message = this.applyTextLimit(message, this.characterLimitOverhead);
        playerSprite['overheadTextSprite'] = SpriteTextFactory.attachTextToSprite(
            playerSprite,
            message,
            this.overheadText,
            sc.get(this.overheadText, 'topOff', 0),
            'overheadTextSprite',
            this.gameManager.getActiveScene()
        );
        let timeOut = sc.get(this.overheadText, 'timeOut', false);
        if(timeOut){
            setTimeout(() => {
                this.destroyTextSprite(playerSprite);
            }, timeOut);
        }
    }

    updateOverheadTextPosition(playerSprite)
    {
        if(!playerSprite['overheadTextSprite']){
            return false;
        }
        let relativePosition = SpriteTextFactory.getTextPosition(
            playerSprite,
            playerSprite.playerName,
            this.overheadText,
            sc.get(this.overheadText, 'topOff', 0)
        );
        playerSprite['overheadTextSprite'].x = relativePosition.x;
        playerSprite['overheadTextSprite'].y = relativePosition.y;
    }

    destroyTextSprite(playerSprite)
    {
        if(!playerSprite['overheadTextSprite']){
            return false;
        }
        playerSprite['overheadTextSprite'].destroy();
        delete playerSprite['overheadTextSprite'];
    }

    showIsTyping()
    {
        if(!this.overHeadChatEnabled || !this.isTyping){
            return false;
        }
        if(!this.isFocussedOnChatInput()){
            return false;
        }
        this.showOverheadChat(
            this.gameManager.getCurrentPlayerAnimation(),
            this.gameManager.config.getWithoutLogs(
                'client/ui/chat/waitingContent',
                this.t(ChatConst.SNIPPETS.WAITING)
            )
        );
    }

    hideIsTyping()
    {
        if(!this.isTyping){
            return false;
        }
        this.destroyTextSprite(this.gameManager.getCurrentPlayerAnimation());
    }

    isFocussedOnChatInput()
    {
        return this.gameManager.gameDom.activeElement() === this.chatInput;
    }

    showChatBox()
    {
        let box = this.uiChat.getChildByProperty('id', ChatConst.CHAT_UI);
        box.classList.remove('hidden');
        this.uiChat.setDepth(4);
        this.chatOpenButton?.classList.add('hidden');
        let readPanel = this.gameDom.getElement(ChatConst.SELECTORS.CHAT_MESSAGES);
        if(readPanel){
            readPanel.parentNode.scrollTop = readPanel.scrollHeight;
        }
        this.hideNotificationsBalloon();
    }

    hideChatBox()
    {
        let box = this.uiChat.getChildByProperty('id', ChatConst.CHAT_UI);
        if(!box){
            Logger.info('Chat UI box not found.');
            return false;
        }
        box.classList.add('hidden');
        this.uiChat.setDepth(1);
        this.chatOpenButton?.classList.remove('hidden');
    }

    showNotificationBalloon()
    {
        this.getActiveBalloon()?.classList.remove('hidden');
    }

    hideNotificationsBalloon()
    {
        this.getActiveBalloon()?.classList.add('hidden');
    }

    getActiveBalloon()
    {
        if(!sc.get(this.uiConfig, 'notificationBalloon')){
            return false;
        }
        let chatBalloon = this.uiChat.getChildByProperty('id', ChatConst.CHAT_BALLOON);
        if(!chatBalloon){
            return false;
        }
        return chatBalloon;
    }

    processMessagesQueue(messages)
    {
        if(0 === messages.length){
            return false;
        }
        for(let message of messages){
            this.attachNewMessage(message);
        }
    }

    attachNewMessage(message)
    {
        if(!this.gameManager.gameEngine.uiScene.cache){
            // expected while uiScene is being created:
            // Logger.info('Missing uiScene cache on chat message.', message);
            return;
        }
        let messageTemplate = this.gameManager.gameEngine.uiScene.cache.html.get('chatMessage');
        let messageString = this.translateMessage(message);
        let output = this.gameManager.gameEngine.parseTemplate(messageTemplate, {
            from: this.translateFrom(message),
            color: ChatConst.TYPE_COLOR[message[ChatConst.TYPES.KEY]],
            message: messageString
        });
        let defaultType = this.showTabs ? ChatConst.TYPES.MESSAGE : '';
        let messageType = sc.get(message, ChatConst.TYPES.KEY, defaultType);
        let chatType = sc.get(this.chatTypesById, messageType, false);
        let appendToTab = '' !== messageType && chatType?.show_tab
            ? this.gameManager.gameDom.getElement(ChatConst.SELECTORS.TAB_CONTENT_PREFIX+messageType)
            : false;
        if(appendToTab){
            this.appendWithScroll(appendToTab, output);
        }
        let alsoShowInTab = chatType.also_show_in_type
            ? this.gameManager.gameDom.getElement(ChatConst.SELECTORS.TAB_CONTENT_PREFIX+chatType.also_show_in_type)
            : false;
        if(alsoShowInTab && alsoShowInTab !== appendToTab){
            this.appendWithScroll(alsoShowInTab, output);
        }
        let appendToMain = '' === messageType
            ? this.gameManager.gameDom.getElement(ChatConst.SELECTORS.CHAT_MESSAGES)
            : false;
        if(appendToMain){
            this.appendWithScroll(appendToMain, output);
        }
        if(this.appendErrorTypeOnActiveTab && ChatConst.TYPES.ERROR === messageType){
            let activeTab = this.gameManager.gameDom.getElement(ChatConst.SELECTORS.TAB_CONTENT_ACTIVE);
            if(
                activeTab
                && activeTab !== appendToTab
                && activeTab !== alsoShowInTab
            ){
                this.appendWithScroll(activeTab, output);
            }
        }
        if(!appendToTab && !alsoShowInTab && !appendToMain){
            if(null === appendToTab){
                Logger.warning('Element not found for selector: .tab-content-'+messageType);
            }
            if(null === alsoShowInTab){
                Logger.warning('Element not found for selector: .tab-content-'+chatType.also_show_in_type);
            }
            Logger.warning('Chat message not attached to any tab or main panel.', {
                message,
                defaultType,
                messageType,
                chatType,
                appendToMain,
                appendToTab
            });
            return;
        }
        if(message[ChatConst.MESSAGE.FROM] && this.isValidMessageType(message[ChatConst.TYPES.KEY])){
            let playerSprite = this.fetchPlayerByName(message[ChatConst.MESSAGE.FROM]);
            if(playerSprite){
                this.showOverheadChat(playerSprite, messageString);
            }
        }
        if(!this.uiChat.getChildByProperty('id', ChatConst.CHAT_UI).classList.contains('hidden')){
            return;
        }
        this.showNotificationBalloon();
    }

    appendWithScroll(appendTo, output)
    {
        appendTo.innerHTML += output;
        appendTo.parentNode.scrollTop = appendTo.scrollHeight;
    }

    translateFrom(message)
    {
        let messageType = message[ChatConst.TYPES.KEY];
        let from = message[ChatConst.MESSAGE.FROM] || ChatConst.TYPES.SYSTEM;
        if(!this.isValidSnippetFromType(messageType)){
            return from;
        }
        return this.t(ChatConst.SNIPPETS.PREFIX + ChatConst.TYPES.KEY + messageType);
    }

    translateMessage(message)
    {
        let messageType = message[ChatConst.TYPES.KEY];
        if(!this.isValidSnippetType(messageType)){
            return message[ChatConst.MESSAGE.KEY];
        }
        let messageData = message[ChatConst.MESSAGE.DATA.KEY];
        if(!messageData){
            return this.t(message[ChatConst.MESSAGE.KEY]);
        }
        if(messageData[ChatConst.MESSAGE.DATA.MODIFIERS]){
            let translatedConcat = '';
            let targetLabel = messageData[ChatConst.MESSAGE.DATA.TARGET_LABEL];
            let propertyKeys = Object.keys(messageData[ChatConst.MESSAGE.DATA.MODIFIERS]);
            for(let propertyKey of propertyKeys){
                let propertyLabel = this.t(propertyKey);
                let propertyValue = messageData[ChatConst.MESSAGE.DATA.MODIFIERS][propertyKey];
                translatedConcat += this.t(message[ChatConst.MESSAGE.KEY], {propertyValue, propertyLabel, targetLabel});
            }
            return translatedConcat;
        }
        return this.t(message[ChatConst.MESSAGE.KEY], messageData);
    }

    t(snippetKey, params = {}, activeLocale = false)
    {
        return this.gameManager.services.translator.t(snippetKey, params, activeLocale);
    }

    isValidMessageType(messageType)
    {
        return -1 === this.validMessageTypes().indexOf(messageType);
    }

    validMessageTypes()
    {
        return [Object.values(ChatConst.TYPES)];
    }

    isValidSnippetType(messageType)
    {
        let validTypes = this.snippetsMessageTypes();
        let typesKeys = Object.keys(validTypes);
        for(let typeKey of typesKeys){
            let type = validTypes[typeKey];
            if(type === messageType){
                return true;
            }
        }
        return false;
    }

    snippetsMessageTypes()
    {
        let types = Object.assign({}, ChatConst.TYPES);
        delete types[ChatConst.TYPES.MESSAGE];
        delete types[ChatConst.TYPES.PRIVATE];
        delete types[ChatConst.TYPES.GLOBAL];
        delete types[ChatConst.TYPES.TEAMS];
        return types;
    }

    isValidSnippetFromType(from)
    {
        return -1 !== [ChatConst.TYPES.SYSTEM, ChatConst.TYPES.ERROR].indexOf(from);
    }

    fetchPlayerByName(playerName)
    {
        let players = this.gameManager.getCurrentPlayer().players;
        let keys = Object.keys(players);
        if(1 >= keys.length){
            return false;
        }
        for(let i of keys){
            let player = players[i];
            if(player.playerName === playerName){
                return player;
            }
        }
    }

    sendChatMessage()
    {
        // validate if there is anything to send:
        if(!this.isValidMessage()){
            return false;
        }
        // check if is a global chat (must begin with #) and if the global chat room is ready:
        let messageAllowedText = this.applyTextLimit(this.chatInput.value, this.characterLimit);
        let message = {act: ChatConst.CHAT_ACTION, m: messageAllowedText};
        this.gameManager.events.emitSync('reldens.chatMessageObjectCreated', this, message);
        // both global or private messages use the global chat room:
        this.useGlobalRoom()
            ? this.useGlobalRoomForMessage(message)
            : this.gameManager.activeRoomEvents.send(message);
        // for last empty the input once the message was sent:
        this.chatInput.value = '';
        if(this.closeChatBoxAfterSend){
            this.hideChatBox();
        }
    }

    applyTextLimit(text, limit)
    {
        // this is also validated on the server:
        return 0 < limit && limit < text.length ? text.substring(0, limit) : text;
    }

    useGlobalRoom()
    {
        return 0 === this.chatInput.value.indexOf('#') || 0 === this.chatInput.value.indexOf('@');
    }

    isValidMessage()
    {
        // this is also validated on the server:
        return this.chatInput.value && 0 < this.chatInput.value.replace('#', '').replace('@', '').trim().length;
    }

    useGlobalRoomForMessage(message)
    {
        // if is global check the global chat room:
        let globalChat = sc.get(this.gameManager.joinedRooms, ChatConst.CHAT_GLOBAL, false);
        if(!globalChat){
            Logger.error('Global chat room not found.');
            return false;
        }
        if(0 === this.chatInput.value.indexOf('@')){
            this.sendPrivateMessage(message, globalChat);
            return;
        }
        this.globalSend(globalChat, message);
    }

    sendPrivateMessage(message, globalChat)
    {
        let playerName = this.chatInput.value.substring(1, this.chatInput.value.indexOf(' '));
        if('@' === playerName){
            return false;
        }
        message.t = playerName;
        this.globalSend(globalChat, message);
    }

    globalSend(globalChat, message)
    {
        try {
            globalChat.send('*', message);
        } catch (error) {
            Logger.critical(error);
            this.gameDom.alertReload(this.gameManager.services.translator.t('game.errors.connectionLost'));
        }
    }

}

module.exports.ChatUi = ChatUi;
