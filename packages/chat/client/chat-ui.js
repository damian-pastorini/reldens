/**
 *
 * Reldens - ChatUi
 *
 */

const { Input } = require('phaser');
const { ChatConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

class ChatUi
{

    constructor(uiScene)
    {
        this.uiScene = uiScene;
        this.gameManager = this.uiScene.gameManager;
        this.uiChat = {};
        this.messagesQueu = [];
        this.chatInput = false;
        this.chatSendButton = false;
        this.chatCloseButton = false;
        this.chatOpenButton = false;
    }

    createUi()
    {
        let {uiX, uiY} = this.uiScene.getUiConfig('chat');
        this.uiChat = this.uiScene.add.dom(uiX, uiY).createFromCache('chat');
        this.uiScene.elementsUi['chat'] = this.uiChat;
        this.chatInput = this.uiChat.getChildByProperty('id', ChatConst.CHAT_INPUT);
        if(!this.chatInput){
            return false;
        }
        this.uiScene.input.keyboard.on('keyup-ENTER', () => {
            let isFocused = (this.gameManager.gameDom.activeElement() === this.chatInput);
            if(!isFocused){
                this.showChatBox();
                this.chatInput.focus();
            }
        });
        this.chatInput.addEventListener('keyup', (event) => {
            if(event.keyCode === Input.Keyboard.KeyCodes.ENTER){
                event.preventDefault();
                this.sendChatMessage();
            }
        });
        this.chatSendButton = this.uiChat.getChildByProperty('id', ChatConst.CHAT_SEND_BUTTON);
        if(this.chatSendButton){
            this.chatSendButton.addEventListener('click', (event) => {
                event.preventDefault();
                this.sendChatMessage(this.chatInput, this.gameManager.activeRoomEvents);
                this.chatInput.focus();
            });
        }
        this.chatCloseButton = this.uiChat.getChildByProperty('id', ChatConst.CHAT_CLOSE_BUTTON);
        this.chatOpenButton = this.uiChat.getChildByProperty('id', ChatConst.CHAT_OPEN_BUTTON);
        if(this.chatCloseButton && this.chatOpenButton){
            this.chatCloseButton.addEventListener('click', () => {
                this.hideChatBox();
            });
            this.chatOpenButton.addEventListener('click', () => {
                this.showChatBox();
            });
            if(this.gameManager.config.get('client/ui/chat/defaultOpen')){
                this.showChatBox();
            }
        }
    }

    showChatBox()
    {
        let box = this.uiChat.getChildByProperty('id', ChatConst.CHAT_UI);
        box.classList.remove('hidden');
        this.uiChat.setDepth(4);
        this.chatOpenButton?.classList.add('hidden');
        this.hideNotificationsBalloon();
    }

    hideChatBox()
    {
        let box = this.uiChat.getChildByProperty('id', ChatConst.CHAT_UI);
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
        if(!this.gameManager.config.get('client/ui/chat/notificationBalloon')){
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
        let readPanel = this.uiChat.getChildByProperty('id', ChatConst.CHAT_MESSAGES);
        if(!readPanel){
            Logger.error('Chat UI not found.');
            this.messagesQueu.push(message);
            return;
        }
        let messageTemplate = this.gameManager.gameEngine.uiScene.cache.html.get('chatMessage');
        let output = this.gameManager.gameEngine.parseTemplate(messageTemplate, {
            from: message[ChatConst.CHAT_FROM],
            color: ChatConst.colors[message.t],
            message: message[ChatConst.CHAT_MESSAGE]
        });
        readPanel.innerHTML += output;
        if (!this.uiChat.getChildByProperty('id', ChatConst.CHAT_UI).classList.contains('hidden')) {
            readPanel.scrollTo(0, readPanel.scrollHeight);
        } else {
            this.showNotificationBalloon();
        }
    }

    sendChatMessage()
    {
        // validate if there is anything to send:
        if((!this.chatInput.value || 0 === this.chatInput.value.replace('#', '').replace('@', '').trim().length)){
            return false;
        }
        // both global or private messages use the global chat room:
        let useGlobalRoom = (0 === this.chatInput.value.indexOf('#') || 0 === this.chatInput.value.indexOf('@'));
        // check if is a global chat (must begin with #) and if the global chat room is ready:
        let message = {act: ChatConst.CHAT_ACTION, m: this.chatInput.value};
        useGlobalRoom ? this.useGlobalRoomForMessage(message) : this.gameManager.activeRoomEvents.room.send(message);
        // for last empty the input once the message was sent:
        this.chatInput.value = '';
    }

    useGlobalRoomForMessage(message)
    {
        // if is global check the global chat room:
        let globalChat = sc.get(this.gameManager.joinedRooms, ChatConst.CHAT_GLOBAL, false);
        if(!globalChat){
            Logger.error('Global chat room not found.');
            return false;
        }
        0 === this.chatInput.value.indexOf('@')
            ? this.sendPrivateMessage(message, globalChat)
            : globalChat.send(message);
    }

    sendPrivateMessage(message, globalChat)
    {
        let playerName = this.chatInput.value.substring(1, this.chatInput.value.indexOf(' '));
        if('@' === playerName){
            return false;
        }
        message.t = playerName;
        globalChat.send(message);
    }
}

module.exports.ChatUi = ChatUi;
