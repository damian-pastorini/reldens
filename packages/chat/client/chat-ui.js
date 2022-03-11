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
    }

    createUi()
    {
        let {uiX, uiY} = this.uiScene.getUiConfig('chat');
        this.uiChat = this.uiScene.add.dom(uiX, uiY).createFromCache('chat');
        this.uiScene.elementsUi['chat'] = this.uiChat;
        let chatInput = this.uiChat.getChildByProperty('id', ChatConst.CHAT_INPUT);
        if(!chatInput){
            return false;
        }
        this.uiScene.input.keyboard.on('keyup_ENTER', () => {
            let isFocused = (this.gameManager.gameDom.activeElement() === chatInput);
            if(!isFocused){
                chatInput.focus();
            }
        });
        chatInput.addEventListener('keyup', (e) => {
            if(e.keyCode === Input.Keyboard.KeyCodes.ENTER){
                e.preventDefault();
                this.sendChatMessage(chatInput, this.gameManager.activeRoomEvents);
            }
        });
        let chatSendButton = this.uiChat.getChildByProperty('id', ChatConst.CHAT_SEND_BUTTON);
        if(chatSendButton){
            chatSendButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.sendChatMessage(chatInput, this.gameManager.activeRoomEvents);
                chatInput.focus();
            });
        }
        let chatCloseButton = this.uiChat.getChildByProperty('id', ChatConst.CHAT_CLOSE_BUTTON);
        let chatOpenButton = this.uiChat.getChildByProperty('id', ChatConst.CHAT_OPEN_BUTTON);
        if(chatCloseButton && chatOpenButton){
            chatCloseButton.addEventListener('click', () => {
                let box = this.uiChat.getChildByProperty('id', ChatConst.CHAT_UI);
                box.classList.add('hidden');
                chatOpenButton.classList.remove('hidden');
                this.uiChat.setDepth(1);
            });
            chatOpenButton.addEventListener('click', () => {
                let box = this.uiChat.getChildByProperty('id', ChatConst.CHAT_UI);
                box.classList.remove('hidden');
                chatOpenButton.classList.add('hidden');
                this.uiChat.setDepth(4);
                this.hideNotificationsBalloon();
            });
            if(this.gameManager.config.get('client/ui/chat/defaultOpen')){
                chatOpenButton.click();
            }
        }
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

    sendChatMessage(chatInput, roomEvents)
    {
        // validate if there is anything to send:
        if((!chatInput.value || 0 === chatInput.value.replace('#', '').replace('@', '').trim().length)){
            return false;
        }
        // both global or private messages use the global chat room:
        let isGlobal = (0 === chatInput.value.indexOf('#') || 0 === chatInput.value.indexOf('@'));
        // check if is a global chat (must begin with #) and if the global chat room is ready:
        let messageData = {act: ChatConst.CHAT_ACTION, m: chatInput.value};
        isGlobal ? this.useGlobalRoomForMessage(roomEvents, chatInput, messageData) : roomEvents.room.send(messageData);
        // for last empty the input once the message was sent:
        chatInput.value = '';
    }

    useGlobalRoomForMessage(roomEvents, chatInput, messageData)
    {
        // if is global check the global chat room:
        let globalChat = sc.get(roomEvents.gameManager.joinedRooms, ChatConst.CHAT_GLOBAL, false);
        if(!globalChat){
            Logger.error('Global chat room not found.');
            return false;
        }
        0 === chatInput.value.indexOf('@')
            ? this.sendPrivateMessage(chatInput, messageData, globalChat)
            : globalChat.send(messageData);
    }

    sendPrivateMessage(chatInput, messageData, globalChat)
    {
        let playerName = chatInput.value.substring(1, chatInput.value.indexOf(' '));
        if('@' === playerName){
            return false;
        }
        messageData.t = playerName;
        globalChat.send(messageData);
    }
}

module.exports.ChatUi = ChatUi;
