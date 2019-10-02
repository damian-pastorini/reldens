/**
 *
 * Reldens - ChatUiCreate
 *
 * This class will handle the chat UI and assign all the related events and actions.
 *
 */

const chatConst = require('./constants');

class ChatUiCreate
{

    constructor(uiScene = false)
    {
        if(!uiScene){
            console.log('ERROR - UiScene false.');
        }
        this.uiScene = uiScene;
    }

    createUi()
    {
        if(!this.uiScene){
            console.log('ERROR - UiScene not defined.');
        }
        this.gameManager = this.uiScene.gameManager;
        this.uiScene.uiChat = this.uiScene.add.dom(360, 420).createFromCache('uiChat');
        let chatInput = this.uiScene.uiChat.getChildByProperty('id', chatConst.CHAT_INPUT);
        let chatSendButton = this.uiScene.uiChat.getChildByProperty('id', chatConst.CHAT_SEND_BUTTON);
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
            chatInput.addEventListener('keyup', (e) => {
                if(e.keyCode === Phaser.Input.Keyboard.KeyCodes.ENTER){
                    e.preventDefault();
                    this.sendChatMessage(chatInput, this.gameManager.activeRoomEvents);
                }
            });
        }
    }

    sendChatMessage(chatInput, roomEvents)
    {
        // validate if there's something to send:
        if((!chatInput.value || chatInput.value.length === 0)){
            return false;
        }
        // both global or private messages use the global chat room:
        let isGlobal = (chatInput.value.indexOf('#') === 0 || chatInput.value.indexOf('@') === 0);
        // check if is a global chat (must begin with #) and if the global chat room is ready:
        let messageData = {act: chatConst.CHAT_ACTION, m: chatInput.value};
        if(isGlobal){
            // if is global check the global chat room:
            if(roomEvents.gameManager.joinedRooms[chatConst.CHAT_GLOBAL]){
                let globalChat = roomEvents.gameManager.joinedRooms[chatConst.CHAT_GLOBAL];
                if(chatInput.value.indexOf('@') === 0){
                    let username = chatInput.value.substring(1, chatInput.value.indexOf(' '));
                    if(username !== '@'){
                        messageData.t = username;
                        globalChat.send(messageData);
                    } else {
                        // NOTE: this will be the user not found case but better not show any response here.
                    }
                } else {
                    globalChat.send(messageData);
                }
            } else {
                console.log('ERROR - Global chat room not found.');
            }
        } else {
            // if is not global then send the message to the current room:
            roomEvents.room.send(messageData);
        }
        // for last empty the input once the message was sent:
        chatInput.value = '';
    }

}

module.exports = ChatUiCreate;
