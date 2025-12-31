/**
 *
 * Reldens - Load Test Bot
 *
 * Run with:
 * withMovement=3000 withChat=10000 node theme/plugins/bot.js --numClients 50 --room reldens-bots-forest --endpoint http://localhost:8080 --output ./logs/bots-console.log
 */

const { ConfigManager } = require('reldens/lib/config/client/config-manager');
const { ChatConst } = require('reldens/lib/chat/constants');
const { GameClient } = require('reldens/lib/game/client/game-client');
const { GameConst } = require('reldens/lib/game/constants');
const { sc } = require('@reldens/utils');
let botsCounter = 1;
let startTimer = new Date().getTime();

async function main (options)
{

    let chatIntervalMs = Number(process.env.withChat || 0);
    let movementIntervalMs = Number(process.env.withMovement || 0);
    let randomGuestName = 'guest-bot-'+sc.randomChars(12);
    console.log('Running bot #'+botsCounter+' - User "'+randomGuestName+'".', {movementIntervalMs, chatIntervalMs});
    botsCounter++;
    let botTimer = new Date().getTime();
    console.log('Time between bots: '+(botTimer - startTimer));
    startTimer = botTimer;

    let userData = {
        isGuest: true,
        isNewUser: true,
        username: randomGuestName,
        password: randomGuestName,
    };

    let gameClient = new GameClient(options.endpoint, new ConfigManager());
    let gameRoom = await gameClient.joinOrCreate('room_game', userData);

    console.log('Joined GameRoom "'+gameRoom.roomId+'" successfully!', randomGuestName);

    function createPlayer(gameMessage)
    {
        userData.password = gameMessage.guestPassword;
        gameRoom.send('*', {
            act: GameConst.CREATE_PLAYER,
            formData: {
                'new-player-name': randomGuestName + '-player',
                'class_path_select': '1',
                'selectedScene': options.roomName
            }
        });
    }

    async function joinBootsRoom(canMove)
    {
        let reldensBootsRoom = await gameClient.joinOrCreate(options.roomName, userData);
        console.log('Joining room "'+options.roomName+'" (ID "'+gameRoom.roomId+'"): '+userData.username);
        return new Promise((resolve) => {
            reldensBootsRoom.onStateChange.once((state) => {
                if(!state.players || !state.players.has){
                    console.log('State synced but players collection not ready:', randomGuestName);
                    resolve({reldensBootsRoom, canMove});
                    return;
                }
                console.log('State synced, player ready:', randomGuestName);
                reldensBootsRoom.onMessage('*', async (roomMessage) => {
                    // console.log('Message from ReldensBots', roomMessage.act);
                    if(GameConst.GAME_OVER === roomMessage.act){
                        // console.log('Player is dead: '+randomGuestName+'.');
                        canMove = false;
                    }
                    if(GameConst.REVIVED === roomMessage.act){
                        // console.log('Player was revived: '+randomGuestName+' at: '+((new Date()).getTime())+'.');
                        canMove = true;
                    }
                });
                resolve({reldensBootsRoom, canMove});
            });
        });
    }

    async function initializeChatMessages(reldensBootsRoom)
    {
        if(0 < chatIntervalMs){
            setInterval(() => {
                // send a general chat message on the room:
                reldensBootsRoom?.send('*', {
                    act: ChatConst.CHAT_ACTION,
                    m: 'Hello ' + userData.username + '! This is a load test bot message. Date: ' + (new Date()).getTime()
                });
            }, chatIntervalMs);
        }
    }

    function initializeMovement(canMove, reldensBootsRoom)
    {
        if(0 < movementIntervalMs){
            setInterval(() => {
                if(!canMove){
                    // console.log('Player "'+userData.username+'" is dead.');
                    return;
                }
                // start moving the player:
                reldensBootsRoom?.send('*', {
                    dir: sc.randomValueFromArray([GameConst.LEFT, GameConst.RIGHT, GameConst.DOWN, GameConst.UP])
                });
                // stop moving the player:
                setTimeout(() => {
                    reldensBootsRoom?.send('*', {act: GameConst.STOP});
                }, 1000);
            }, movementIntervalMs);
        }
    }

    gameRoom.onMessage('*', async (gameMessage) => {
        if(gameMessage.error){
            console.log(gameMessage.error);
            return false;
        }

        if(GameConst.START_GAME === gameMessage.act){
            createPlayer(gameMessage);
        }

        if(GameConst.CREATE_PLAYER_RESULT === gameMessage.act){
            userData.isNewUser = false;
            userData.selectedPlayer = gameMessage.player.id;
            userData.selectedScene = options.roomName;
            let canMove = true;

            let joinResult = await joinBootsRoom(canMove);
            let reldensBootsRoom = joinResult.reldensBootsRoom;
            canMove = joinResult.canMove;

            await initializeChatMessages(reldensBootsRoom);

            initializeMovement(canMove, reldensBootsRoom);
        }
    });

}

(async () => {
    let loadtest = await import('@colyseus/loadtest');
    loadtest.cli(main);
})();
