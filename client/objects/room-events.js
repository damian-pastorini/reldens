const PhaserPlayer = require('./player');
const DynamicScene = require('./scene-dynamic');
const ScenePreloader = require('./scene-preloader');
const share = require('../../shared/constants');

class RoomEvents
{

    constructor(roomName, phaserGame, colyseusClient)
    {
        this.colyseusClient = colyseusClient;
        this.phaserGame = phaserGame;
        this.room = false;
        this.roomName = roomName;
        this.sceneData = false;
        this.colyseusClient.getAvailableRooms(share.CHAT_GLOBAL, () => {
            this.globalChat = this.getGlobalChatRoom();
        });
    }

    getGlobalChatRoom()
    {
        let globalChatRoom = false;
        for (let idx in this.colyseusClient.rooms) {
            let room = this.colyseusClient.rooms[idx];
            if(room.name === share.CHAT_GLOBAL){
                globalChatRoom = room;
                break;
            }
        }
        return globalChatRoom;
    }

    getSceneData(room)
    {
        if(!this.sceneData && room.state){
            this.sceneData = JSON.parse(room.state.sceneData)
        }
        return this.sceneData;
    }

    startListen(room, previousScene = false)
    {
        this.room = room;
        // listen to changes coming from the server:
        this.room.state.players.onChange = (player, key) => {
            // do not move player if is changing scene:
            if(player.scene !== this.roomName){
                return;
            }
            this.getSceneData(this.room);
            let currentScene = this.getActiveScene();
            if(currentScene.player && currentScene.player.players.hasOwnProperty(key)){
                let playerToMove = currentScene.player.players[key];
                if(playerToMove){
                    // @TODO: improve the implementation using client physics for prediction.
                    // See NEXT items in Road Map: https://github.com/damian-pastorini/reldens/wiki/Road-Map
                    // @NOTE: we commented the speed since the body position is given by the body speed in
                    // the server, this is to prevent client hacks.
                    if(player.x !== playerToMove.x){
                        if(key !== this.room.sessionId && playerToMove.anims){
                            if(player.x < playerToMove.x){
                                playerToMove.anims.play(share.LEFT, true);
                                // playerToMove.body.velocity.x = -share.SPEED;
                            } else {
                                playerToMove.anims.play(share.RIGHT, true);
                                // playerToMove.body.velocity.x = share.SPEED;
                            }
                        }
                        playerToMove.x = parseFloat(player.x);
                    }
                    if(player.y !== playerToMove.y){
                        if(key !== this.room.sessionId && playerToMove.anims){
                            if(player.y < playerToMove.y){
                                playerToMove.anims.play(share.UP, true);
                                // playerToMove.body.velocity.y = -share.SPEED;
                            } else {
                                playerToMove.anims.play(share.DOWN, true);
                                // playerToMove.body.velocity.y = share.SPEED;
                            }
                        }
                        playerToMove.y = parseFloat(player.y);
                    }
                    // player stop action:
                    if(key !== this.room.sessionId && player.mov !== playerToMove.mov && playerToMove.anims){
                        if(!player.mov){
                            // playerToMove.body.velocity.x = 0;
                            // playerToMove.body.velocity.y = 0;
                            playerToMove.anims.stop();
                        }
                        playerToMove.mov = player.mov;
                    }
                    // player change direction action:
                    if(player.dir !== playerToMove.dir){
                        // playerToMove.body.velocity.x = 0;
                        // playerToMove.body.velocity.y = 0;
                        playerToMove.dir = player.dir;
                        playerToMove.anims.play(player.dir, true);
                        playerToMove.anims.stop();
                    }
                }
            }
        };
        this.room.state.players.onRemove = (player, key) => {
            if(key === this.room.sessionId){
                alert('Your session ended, please login again.');
                window.location.reload();
            } else {
                let currentScene = this.getActiveScene();
                if(currentScene.player.players.hasOwnProperty(key)){
                    // remove your player entity from the game world:
                    currentScene.player.players[key].destroy();
                    delete currentScene.player.players[key];
                }
            }
        };
        // create players or change scenes:
        this.room.onMessage.add((message) => {
            this.getSceneData(this.room);
            if(message.act === share.ADD_PLAYER){
                // create current player:
                if(message.id === this.room.sessionId){
                    this.startPhaserScene(message, this.room, previousScene);
                }
                // add new players into the current player scene:
                if(message.id !== this.room.sessionId){
                    let currentScene = this.getActiveScene();
                    if(currentScene.key === message.player.scene){
                        if(currentScene.player && currentScene.player.players){
                            let posX = parseFloat(message.player.x),
                                posY = parseFloat(message.player.y);
                            currentScene.player.addPlayer(message.id, posX, posY, message.player.dir);
                        }
                    }
                }
            }
            if(message.act === share.CHANGED_SCENE && message.scene === this.room.name && this.room.sessionId !== message.id){
                let currentScene = this.getActiveScene();
                // if other users enter in the current scene we need to add them:
                let {id, x, y, dir} = message;
                currentScene.player.addPlayer(id, x, y, dir);
            }
            // @NOTE: here we don't need to evaluate the id since the reconnect only is sent to the current client.
            if(message.act === share.RECONNECT){
                this.colyseusClient.reconnectColyseus(message, this.room);
            }
            // chat events:
            let uiScene = this.phaserGame.uiScene;
            if(uiScene && message.act === share.CHAT_ACTION){
                let readPanel = uiScene.uiChat.getChildByProperty('id', share.CHAT_MESSAGES);
                if(readPanel){
                    readPanel.innerHTML += `${message[share.CHAT_FROM]}: ${message[share.CHAT_MESSAGE]}<br/>`;
                    readPanel.scrollTo(0, readPanel.scrollHeight);
                }
            }
            if(message.act === share.PLAYER_STATS){
                let currentScene = this.getActiveScene();
                if(currentScene.player && currentScene.player.players.hasOwnProperty(room.sessionId)){
                    let playerToMove = currentScene.player.players[room.sessionId];
                    playerToMove.stats = message.stats;
                }
                if(uiScene){
                    let statsBox = uiScene.uiBoxPlayerStats.getChildByProperty('id', 'box-player-stats');
                    let statsButton = uiScene.uiBoxPlayerStats.getChildByProperty('id', 'player-stats-btn');
                    let statsPanel = uiScene.uiBoxPlayerStats.getChildByProperty('id', 'player-stats-container');
                    if(statsButton && statsPanel){
                        // @TODO: stats labels will be part of the configuration in the database.
                        statsPanel.innerHTML += `<span class="stat-label">hp:</span><span class="stat-value">${message.stats.hp}</span>
                            <span class="stat-label">mp:</span><span class="stat-value">${message.stats.mp}</span>
                            <span class="stat-label">atk:</span><span class="stat-value">${message.stats.atk}</span>
                            <span class="stat-label">def:</span><span class="stat-value">${message.stats.def}</span>
                            <span class="stat-label">dodge:</span><span class="stat-value">${message.stats.dodge}</span>
                            <span class="stat-label">speed:</span><span class="stat-value">${message.stats.speed}</span>`;
                        statsButton.addEventListener('click', () => {
                            if(statsPanel.style.display === 'none'){
                                statsPanel.style.display = 'block';
                                statsBox.style.left = '-80px';
                            } else {
                                statsPanel.style.display = 'none';
                                statsBox.style.left = '0px';
                            }
                        });
                    }
                }
            }
        });
        // room error:
        this.room.onError.add((data) => {
            alert('There was a room connection error.');
            console.log('ERROR - ', data);
            window.location.reload();
        });
    }

    registerChat()
    {
        // @TODO: temporal fix, analyze the issue, probably related to the first event attached to the input.
        if(gameClient.hasOwnProperty('room') && gameClient.room.id !== this.room.id){
            this.room = gameClient.room;
        }
        let uiScene = this.phaserGame.uiScene;
        let chatInput = uiScene.uiChat.getChildByProperty('id', share.CHAT_INPUT);
        let chatSendButton = uiScene.uiChat.getChildByProperty('id', share.CHAT_SEND_BUTTON);
        if(chatInput){
            uiScene.input.keyboard.on('keyup_ENTER', () => {
                let isFocused = (document.activeElement === chatInput);
                if(!isFocused){
                    chatInput.focus();
                }
            });
            if(chatSendButton){
                chatSendButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.sendChatMessage(chatInput);
                    chatInput.focus();
                });
            }
            chatInput.addEventListener('keyup', (e) => {
                if(e.keyCode === Phaser.Input.Keyboard.KeyCodes.ENTER){
                    e.preventDefault();
                    this.sendChatMessage(chatInput);
                }
            });
        }
    }

    sendChatMessage(chatInput)
    {
        if((!chatInput.value || chatInput.value.length === 0)){
            return false;
        }
        // both global or private messages use the global chat room:
        let isGlobal = (chatInput.value.indexOf('#') === 0 || chatInput.value.indexOf('@') === 0);
        // check if is a global chat (must begin with #) and if the global chat room is ready:
        let messageData = {act: share.CHAT_ACTION, m: chatInput.value};
        if(isGlobal && this.globalChat){
            if(chatInput.value.indexOf('@') === 0){
                let username = chatInput.value.substring(1, chatInput.value.indexOf(' '));
                if(username !== '@'){
                    messageData.t = username;
                    this.globalChat.send(messageData);
                } else {
                    // NOTE: this will be the user not found case but better not show any response here.
                }
            } else {
                this.globalChat.send(messageData);
            }
        } else {
            // @TODO: temporal fix, analyze why this.room is different from client.room.
            if(gameClient.hasOwnProperty('room') && this.room !== gameClient.room){
                this.room = gameClient.room;
            }
            this.room.send(messageData);
        }
        chatInput.value = '';
    }

    startPhaserScene(message, room, previousScene = false)
    {
        let sceneData = this.getSceneData(room);
        let preloaderName = share.SCENE_PRELOADER+sceneData.sceneName;
        let uiScene = false;
        if(!this.phaserGame.uiScene){
            uiScene = true;
        }
        let scenePreloader = new ScenePreloader(preloaderName, sceneData.sceneMap, sceneData.sceneImages, uiScene);
        if(!this.phaserGame.scene.getScene(preloaderName)){
            this.phaserGame.scene.add(preloaderName, scenePreloader, true);
            let preloader = this.phaserGame.scene.getScene(preloaderName);
            preloader.load.on('complete', () => {
                // set ui on first preloader scene:
                if(!this.phaserGame.uiScene){
                    this.phaserGame.uiScene = preloader;
                    let element = preloader.uiBoxRight.getChildByProperty('className', 'player-name');
                    if(element){
                        element.innerHTML = message.player.username;
                    }
                }
                this.createPhaserScene(message, room, previousScene, sceneData);
            });
        } else {
            this.createPhaserScene(message, room, previousScene, sceneData);
        }
    }

    createPhaserScene(message, room, previousScene, sceneData)
    {
        if(!this.phaserGame.scene.getScene(message.player.scene)){
            let phaserDynamicScene = new DynamicScene(message.player.scene, sceneData);
            this.phaserGame.scene.add(message.player.scene, phaserDynamicScene, false);
        }
        if(!this.phaserGame.colyseusRoom){
            this.phaserGame.scene.start(message.player.scene);
        } else {
            if(previousScene){
                this.phaserGame.scene.stop(previousScene);
                this.phaserGame.scene.start(message.player.scene);
            }
        }
        this.phaserGame.colyseusRoom = room;
        let currentScene = this.phaserGame.scene.getScene(message.player.scene);
        let playerPos = {
            x: parseFloat(message.player.x),
            y: parseFloat(message.player.y),
            direction: message.player.dir
        };
        let currentPlayer = new PhaserPlayer(currentScene, message.player.scene, playerPos);
        currentPlayer.socket = room;
        currentPlayer.playerId = room.sessionId;
        currentPlayer.username = message.player.username;
        currentScene.player = currentPlayer;
        currentScene.player.create();
        if(room.state.players){
            for(let idx in room.state.players){
                let tmp = room.state.players[idx];
                if(tmp.sessionId && tmp.sessionId !== room.sessionId){
                    currentScene.player.addPlayer(tmp.sessionId, tmp.x, tmp.y, tmp.dir);
                }
            }
        }
        // request player stats after the player was add to the scene:
        room.send({act: share.PLAYER_STATS});
        // for last register the chat:
        this.registerChat();
    }

    getActiveScene()
    {
        if(!this.phaserGame.scene.getScene(this.roomName)){
            if(this.sceneData){
                let phaserDynamicScene = new DynamicScene(this.roomName, this.sceneData);
                this.phaserGame.scene.add(this.roomName, phaserDynamicScene, false);
            }
        }
        return this.phaserGame.scene.getScene(this.roomName);
    }

}

module.exports = RoomEvents;
