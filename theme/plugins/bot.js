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

    gameRoom.onMessage('*', async (gameMessage) => {
        if(gameMessage.error){
            console.log(gameMessage.error);
            return false;
        }

        if(GameConst.START_GAME === gameMessage.act){
            userData.password = gameMessage.guestPassword;
            console.log('Game started successfully!');
            gameRoom.send('*', {
                act: GameConst.CREATE_PLAYER,
                formData: {
                    'new-player-name': randomGuestName+'-player',
                    'class_path_select': '1'
                }
            });
        }

        if(GameConst.CREATE_PLAYER_RESULT === gameMessage.act){
            userData.isNewUser = false;
            userData.selectedPlayer = gameMessage.player.id;
            userData.selectedScene = 'reldens-bots-forest';

            // join the bots room:
            let reldensBootsRoom = await gameClient.joinOrCreate('reldens-bots-forest', userData);
            let canMove = true;
            reldensBootsRoom.onMessage('*', async (roomMessage) => {
                console.log('Message from ReldensBots Room!', roomMessage.act);
                if(GameConst.GAME_OVER === roomMessage.act){
                    console.log('Player is dead: '+randomGuestName+'.');
                    canMove = false;
                }
                if(GameConst.REVIVED === roomMessage.act){
                    console.log('Player was revived: '+randomGuestName+'.');
                    canMove = true;
                }
            });

            // join the global chat room:
            let chatRoom = await gameClient.joinOrCreate('chat', userData);
            chatRoom.onMessage('*', async (chatMessage) => {
                // console.log('Message from Chat Room!', chatMessage.act);
            });

            // make some random stuff (send chat messages and move randomly):
            setInterval(() => {
                if(!canMove){
                    console.log('Player "'+userData.username+'" is dead.');
                    return;
                }
                // send a general chat message on the room:
                reldensBootsRoom.send('*', {
                    act: ChatConst.CHAT_ACTION,
                    m: 'Hello '+userData.username+'! This is a load test bot message. Date: '+(new Date()).getTime()
                });
                // start moving the player:
                reldensBootsRoom.send('*', {
                    dir: sc.randomValueFromArray([GameConst.LEFT, GameConst.RIGHT, GameConst.DOWN, GameConst.UP])
                });
                // stop moving the player:
                setTimeout(() => {
                    reldensBootsRoom.send('*', {act: GameConst.STOP});
                }, 1000);
            }, 3000);
        }
    });

}

cli(main);
