/**
 *
 * Reldens - Load Test Bot
 *
 * Run with:
 * node bot.js --numClients 10 --room room_game --endpoint http://localhost:8080
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

    console.log('Joined GameRoom successfully!', randomGuestName);

    gameRoom.onMessage('*', async (message) => {
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
                    'new-player-name': randomGuestName+'-player',
                    'class_path_select': '1'
                }
            });
        }

        if(GameConst.CREATE_PLAYER_RESULT === message.act){
            userData.isNewUser = false;
            userData.selectedPlayer = message.player.id;
            userData.selectedScene = 'reldens-bots';

            // join the bots room:
            let reldensBootsRoom = await gameClient.joinOrCreate('reldens-bots', userData);
            reldensBootsRoom.onMessage('*', async (message) => {
                console.log('Message from ReldensBots Room!', message.act);
            });

            // join the global chat room:
            let chatRoom = await gameClient.joinOrCreate('chat', userData);
            chatRoom.onMessage('*', async (message) => {
                // console.log('Message from Chat Room!', message.act);
            });

            // make some random stuff (send chat messages and move randomly):
            setInterval(() => {
                // every 2s send a general chat message on the room:
                reldensBootsRoom.send('*', {
                    act: ChatConst.CHAT_ACTION,
                    m: 'Hello, '+userData.username+'! I am the Load Test Bot. I am allowed to send messages to you!'
                });
                // every 2s start moving the player:
                reldensBootsRoom.send('*', {
                    dir: sc.randomValueFromArray([GameConst.LEFT, GameConst.RIGHT, GameConst.DOWN, GameConst.UP])
                });
                // every second stop moving the player:
                setTimeout(() => {
                    reldensBootsRoom.send('*', {act: GameConst.STOP});
                }, 1000);
            }, 2000);
        }
    });
}

cli(main);
