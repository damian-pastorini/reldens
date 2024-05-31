/**
 *
 * Reldens - Load Test Bot
 *
 * Run with:
 * node bot.js --numClients 1 --room room_game --endpoint http://localhost:8080
 */

const { cli } = require('@colyseus/loadtest');
const { ChatConst } = require('reldens/lib/chat/constants');
const { GameClient } = require('reldens/lib/game/client/game-client');
const { GameConst } = require('reldens/lib/game/constants');
const { sc } = require('@reldens/utils');

async function main (options)
{
    let randomGuestName = 'guest-bot-'+sc.randomChars(12);
    let userData = {
        isGuest: true,
        isNewUser: true,
        username: randomGuestName,
        password: randomGuestName,
    };

    let gameClient = new GameClient(options.endpoint);
    let gameRoom = await gameClient.joinOrCreate(options.roomName, userData);

    console.log('Joined GameRoom successfully!');

    gameRoom.onMessage('*', async (message) => {

        console.log('GameRoom.onMessage', message.act, sc.getCurrentDate());

        if(message.error){
            console.log(message.error);
            return false;
        }

        if (GameConst.START_GAME === message.act) {
            userData.password = message.guestPassword;
            console.log('Game started successfully!');
            gameRoom.send('*', {
                act: GameConst.CREATE_PLAYER,
                formData: {
                    'new-player-name': 'bot-'+randomGuestName+'-player',
                    'class_path_select': '1'
                }
            });
        }

        if(GameConst.CREATE_PLAYER_RESULT === message.act){
            userData.isNewUser = false;
            userData.selectedPlayer = message.player.id;
            userData.selectedScene = '';
            let reldensTownRoom = await gameClient.joinOrCreate('reldens-town', userData);
            reldensTownRoom.onMessage('*', async (message) => {
                console.log('Message from ReldensTown Room!', message.act);
            });
            let chatRoom = await gameClient.joinOrCreate('chat', userData);
            chatRoom.onMessage('*', async (message) => {
                console.log('Message from Chat Room!', message.act);
            });
            setInterval(() => {
                let messageData = {
                    act: ChatConst.CHAT_ACTION,
                    m: 'Hello, '+userData.username+'! I am the Load Test Bot. I am allowed to send messages to you!'
                };
                console.log('Sending message', messageData);
                reldensTownRoom.send('*', messageData);
            }, 1000);
        }
    });
}

cli(main);
