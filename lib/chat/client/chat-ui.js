/**
 *
 * Reldens - ChatUi
 *
 */

const { Input } = require('phaser');
const { ChatConst } = require('../constants');
const { SpriteTextFactory } = require('../../game/client/engine/sprite-text-factory');
const { Logger, sc } = require('@reldens/utils');

class ChatUi
{

    constructor(props)
    {
        this.uiSceneManager = sc.get(props, 'uiSceneManager', false);
        this.gameManager = sc.get(props, 'gameManager', false);
        this.validateArguments();

        this.uiChat = {};
        this.messagesQueu = [];
        this.chatInput = false;
        this.chatSendButton = false;
        this.chatCloseButton = false;
        this.chatOpenButton = false;

        this.uiSceneDriver = this.uiSceneManager.uiSceneDriver;
        this.configManager = this.uiSceneManager.configManager;
        this.uiConfigName = 'chat';
    }

    validateArguments()
    {
        if (!this.uiSceneManager) {
            Logger.error('UiSceneManager undefined in ChatUi.');
        }
        if (!this.gameManager) {
            Logger.error('GameManager undefined in ChatUi.');
        }
    }

    createUi()
    {
        let {uiX, uiY} = this.uiSceneManager.getUiConfig(this.uiConfigName);
        this.uiChat = this.uiSceneDriver.usingElementUi().setupElement(this.uiConfigName, uiX, uiY);

        this.setupChatInput();
        this.setupKeyPressBehaviors();
        this.setupSendButton();
        this.setupCloseButton();
        this.setupOpenButton();
        if(this.configManager.get('client/ui/chat/overheadChat/enabled')){
            this.setupOverheadChatEvents();
        }
        if(this.configManager.get('client/ui/chat/defaultOpen')){
            this.showChatBox();
        }
    }

    setupChatInput()
    {
        this.chatInput = this.uiSceneDriver.usingElementUi().getElementChildByProperty(this.uiConfigName,'id', ChatConst.CHAT_INPUT);
        if(!this.chatInput){
            return false;
        }
        this.chatInput.addEventListener('onfocusout', () => {
            this.hideIsTyping();
        });
    }

    setupOverheadChatEvents()
    {
        this.uiSceneManager.eventsManager.on('reldens.runPlayerAnimation', (playerEngine, playerId, playerState, playerSprite) => {
            this.updateOverheadTextPosition(playerSprite);
        });
    }

    setupCloseButton()
    {
        this.chatCloseButton = this.uiSceneDriver.usingElementUi().getElementChildByProperty(this.uiConfigName,'id', ChatConst.CHAT_CLOSE_BUTTON);
        this.chatCloseButton?.addEventListener('click', () => {
            this.hideChatBox();
        });
    }

    setupOpenButton()
    {
        this.chatOpenButton = this.uiSceneDriver.usingElementUi().getElementChildByProperty(this.uiConfigName,'id', ChatConst.CHAT_OPEN_BUTTON);
        this.chatOpenButton?.addEventListener('click', () => {
            this.showChatBox();
        });
    }

    setupSendButton()
    {
        this.chatSendButton = this.uiSceneDriver.usingElementUi().getElementChildByProperty(this.uiConfigName,'id', ChatConst.CHAT_SEND_BUTTON);
        this.chatSendButton?.addEventListener('click', (event) => {
            event.preventDefault();
            this.sendChatMessage(this.chatInput, this.uiSceneManager.getActiveRoomEventsCallback());
            this.chatInput.focus();
        });
    }

    setupKeyPressBehaviors()
    {
        this.uiSceneManager.uiSceneDriver.inputKeyboardOn('keyup-ENTER', () => {
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
        if(!this.configManager.get('client/ui/chat/overheadChat/enabled')){
            return false;
        }
        if(playerSprite['overheadTextSprite']){
            this.destroyTextSprite(playerSprite);
        }
        let textConfig = this.configManager.get('client/ui/chat/overheadText');
        message = this.applyTextLimit(
            message,
            this.configManager.get('client/chat/messages/characterLimitOverhead')
        );
        playerSprite['overheadTextSprite'] = SpriteTextFactory.attachTextToSprite(
            playerSprite,
            message,
            textConfig,
            textConfig.topOff,
            'overheadTextSprite',
            this.uiSceneManager.getActiveSceneCallback()
        );
        let timeOut = sc.get(textConfig, 'timeOut', false);
        if(timeOut){
            setTimeout(() => {
                this.destroyTextSprite(playerSprite);
            }, timeOut);
        }
    }

    updateOverheadTextPosition(playerSprite)
    {
        let textConfig = this.configManager.get('client/ui/chat/overheadText');
        if(!playerSprite['overheadTextSprite']){
            return false;
        }
        let relativePosition = SpriteTextFactory.getTextPosition(
            playerSprite,
            playerSprite.playerName,
            textConfig,
            textConfig.topOff
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
        let config = this.configManager.get('client/ui/chat/overheadChat');
        if(!config.enabled || !config.isTyping){
            return false;
        }
        if(!this.isFocussedOnChatInput()){
            return false;
        }
        this.showOverheadChat(this.gameManager.getCurrentPlayerAnimation(), '...');
    }

    hideIsTyping()
    {
        if(!this.configManager.get('client/ui/chat/overheadChat/isTyping')){
            return false;
        }
        this.destroyTextSprite(this.gameManager.getCurrentPlayerAnimation());
    }

    isFocussedOnChatInput()
    {
        return this.uiSceneManager.gameDom.activeElement() === this.chatInput;
    }

    showChatBox()
    {
        let box = this.uiSceneDriver.usingElementUi().getElementChildByProperty(this.uiConfigName,'id', ChatConst.CHAT_UI);
        box.classList.remove('hidden');
        this.uiChat.setDepth(4);
        this.chatOpenButton?.classList.add('hidden');
        this.hideNotificationsBalloon();
    }

    hideChatBox()
    {
        let box = this.uiSceneDriver.usingElementUi().getElementChildByProperty(this.uiConfigName,'id', ChatConst.CHAT_UI);
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
        if(!this.configManager.get('client/ui/chat/notificationBalloon')){
            return false;
        }
        let chatBalloon = this.uiSceneDriver.usingElementUi().getElementChildByProperty(this.uiConfigName,'id', ChatConst.CHAT_BALLOON);
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
        let readPanel = this.uiSceneDriver.usingElementUi().getElementChildByProperty(this.uiConfigName,'id', ChatConst.CHAT_MESSAGES);
        if(!readPanel){
            Logger.error('Chat UI not found.');
            this.messagesQueu.push(message);
            return;
        }
        let output = this.uiSceneDriver.usingElementUi().parseLoadedContent('chatMessage', {
            from: message[ChatConst.CHAT_FROM],
            color: ChatConst.colors[message.t],
            message: message[ChatConst.CHAT_MESSAGE]
        });
        readPanel.innerHTML += output;

        if(message[ChatConst.CHAT_FROM] && this.isValidMessageType(message.t)){
            let playerSprite = this.fetchPlayerByName(message[ChatConst.CHAT_FROM]);
            if(playerSprite){
                this.showOverheadChat(playerSprite, message[ChatConst.CHAT_MESSAGE]);
            }
        }
        if(this.isChatBoxVisible()){
            readPanel.scrollTo(0, readPanel.scrollHeight);
        } else {
            this.showNotificationBalloon();
        }
    }

    isValidMessageType(messageType)
    {
        return ChatConst.CHAT_TYPE_SYSTEM !== messageType
            && ChatConst.CHAT_TYPE_SYSTEM_ERROR !== messageType
            && ChatConst.CHAT_TYPE_SYSTEM_BATTLE !== messageType;
    }

    fetchPlayerByName(playerName)
    {
        let players = this.uiSceneManager.getActiveSceneCallback().player.players;
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
        let messageAllowedText = this.applyTextLimit(
            this.chatInput.value,
            this.configManager.get('client/chat/messages/characterLimit')
        );
        let message = {act: ChatConst.CHAT_ACTION, m: messageAllowedText};
        this.uiSceneManager.eventsManager.emitSync('reldens.chatMessageObjectCreated', this, message);
        // both global or private messages use the global chat room:
        this.useGlobalRoom()
            ? this.useGlobalRoomForMessage(message)
            : this.uiSceneManager.getActiveRoomEventsCallback().room.send('*', message);
        // for last empty the input once the message was sent:
        this.chatInput.value = '';
        if(this.configManager.get('client/ui/chat/overheadChat/closeChatBoxAfterSend')){
            this.hideChatBox();
        }
    }

    applyTextLimit(text, limit)
    {
        return 0 < limit && limit < text.length ? text.substring(0, limit) : text;
    }

    useGlobalRoom()
    {
        return 0 === this.chatInput.value.indexOf('#') || 0 === this.chatInput.value.indexOf('@');
    }

    isValidMessage()
    {
        return this.chatInput.value && 0 < this.chatInput.value.replace('#', '').replace('@', '').trim().length;
    }

    useGlobalRoomForMessage(message)
    {
        let globalChat = sc.get(this.gameManager.joinedRooms, ChatConst.CHAT_GLOBAL, false);
        if(!globalChat){
            Logger.error('Global chat room not found.');
            return false;
        }
        0 === this.chatInput.value.indexOf('@')
            ? this.sendPrivateMessage(message, globalChat)
            : globalChat.send('*', message);
    }

    sendPrivateMessage(message, globalChat)
    {
        let playerName = this.chatInput.value.substring(1, this.chatInput.value.indexOf(' '));
        if('@' === playerName){
            return false;
        }
        message.t = playerName;
        globalChat.send('*', message);
    }

    isChatBoxVisible()
    {
        return !this.uiSceneDriver.usingElementUi().getElementChildByProperty(this.uiConfigName,'id', ChatConst.CHAT_UI).classList.contains('hidden');
    }
}

module.exports.ChatUi = ChatUi;
