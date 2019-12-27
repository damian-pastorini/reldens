/**
 *
 * Reldens - ChatUiCreate
 *
 * This class will handle the chat UI and assign all the related events and actions.
 *
 */

const { Input } = require('phaser');
const { ChatConst } = require('../constants');
const { Logger } = require('../../game/logger');

class ChatUi
{

    constructor(uiScene)
    {
        this.uiScene = uiScene;
        this.gameManager = this.uiScene.gameManager;
    }

    createUi()
    {
        let chatX = this.gameManager.config.get('client/chat/position/x');
        let chatY = this.gameManager.config.get('client/chat/position/y');
        this.uiScene.uiChat = this.uiScene.add.dom(chatX, chatY).createFromCache('uiChat');
        let chatInput = this.uiScene.uiChat.getChildByProperty('id', ChatConst.CHAT_INPUT);
        let chatSendButton = this.uiScene.uiChat.getChildByProperty('id', ChatConst.CHAT_SEND_BUTTON);
        let chatCloseButton = this.uiScene.uiChat.getChildByProperty('id', ChatConst.CHAT_CLOSE_BUTTON);
        let chatOpenButton = this.uiScene.uiChat.getChildByProperty('id', ChatConst.CHAT_OPEN_BUTTON);
        if(chatInput){
            this.uiScene.input.keyboard.on('keyup_ENTER', () => {
                let isFocused = (document.activeElement === chatInput);
                if(!isFocused){
                    chatInput.focus();
                }
            });
            if(chatSendButton){
                chatSendButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.sendChatMessage(chatInput, this.gameManager.activeRoomEvents);
                    chatInput.focus();
                });
            }
            if(chatCloseButton && chatOpenButton){
                chatCloseButton.addEventListener('click', () => {
                    let box = this.uiScene.uiChat.getChildByProperty('id', 'chat-ui');
                    box.style.display = 'none';
                    chatOpenButton.style.display = 'block';
                });
                chatOpenButton.addEventListener('click', () => {
                    let box = this.uiScene.uiChat.getChildByProperty('id', 'chat-ui');
                    box.style.display = 'block';
                    chatOpenButton.style.display = 'none';
                });
            }
            chatInput.addEventListener('keyup', (e) => {
                if(e.keyCode === Input.Keyboard.KeyCodes.ENTER){
                    e.preventDefault();
                    this.sendChatMessage(chatInput, this.gameManager.activeRoomEvents);
                }
            });
        }
    }

    sendChatMessage(chatInput, roomEvents)
    {
        // validate if there is anything to send:
        if((!chatInput.value || chatInput.value.replace('#', '').replace('@', '').trim().length === 0)){
            return false;
        }
        // both global or private messages use the global chat room:
        let isGlobal = (chatInput.value.indexOf('#') === 0 || chatInput.value.indexOf('@') === 0);
        // check if is a global chat (must begin with #) and if the global chat room is ready:
        let messageData = {act: ChatConst.CHAT_ACTION, m: chatInput.value};
        if(isGlobal){
            // if is global check the global chat room:
            if(roomEvents.gameManager.joinedRooms[ChatConst.CHAT_GLOBAL]){
                let globalChat = roomEvents.gameManager.joinedRooms[ChatConst.CHAT_GLOBAL];
                if(chatInput.value.indexOf('@') === 0){
                    let username = chatInput.value.substring(1, chatInput.value.indexOf(' '));
                    if(username !== '@'){
                        messageData.t = username;
                        globalChat.send(messageData);
                    } else {
                        // NOTE: this case will be when the user was not found case but better not send any response.
                    }
                } else {
                    globalChat.send(messageData);
                }
            } else {
                Logger.error('Global chat room not found.');
            }
        } else {
            // if is not global then send the message to the current room:
            roomEvents.room.send(messageData);
        }
        // for last empty the input once the message was sent:
        chatInput.value = '';
    }

}

module.exports.ChatUi = ChatUi;
