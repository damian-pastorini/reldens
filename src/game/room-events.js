const PlayerEngine = require('../users/player-engine');
const DynamicScene = require('./scene-dynamic');
const ScenePreloader = require('./scene-preloader');
const share = require('../utils/constants');
const chatConst = require('../chat/constants');

class RoomEvents
{

    constructor(roomName, gameEngine, gameClient)
    {
        this.gameClient = gameClient;
        this.gameEngine = gameEngine;
        this.room = false;
        this.roomName = roomName;
        this.sceneData = false;
        // @TODO: move to chat feature.
        this.globalChat = gameClient.globalChat;
        this.playersQueue = {};
    }

    getSceneData(room)
    {
        if(room.state && (!this.sceneData || room.state !== this.sceneData)){
            this.sceneData = JSON.parse(room.state.sceneData);
        }
        return this.sceneData;
    }

    startListen(room, previousScene = false)
    {
        this.room = room;
        // listen to changes coming from the server:
        this.room.state.players.onChange = (player, key) => {
            // do not move player if is changing scene:
            if(player.state.scene !== this.roomName){
                return;
            }
            this.getSceneData(this.room);
            let currentScene = this.getActiveScene();
            if(currentScene.player && currentScene.player.players.hasOwnProperty(key)){
                let playerSprite = currentScene.player.players[key];
                if(playerSprite){
                    // @NOTE: player speed is defined by the server.
                    if(player.state.x !== playerSprite.x){
                        if(key !== this.room.sessionId && playerSprite.anims){
                            if(player.state.x < playerSprite.x){
                                playerSprite.anims.play(share.LEFT, true);
                            } else {
                                playerSprite.anims.play(share.RIGHT, true);
                            }
                        }
                        playerSprite.x = parseFloat(player.state.x);
                    }
                    if(player.state.y !== playerSprite.y){
                        if(key !== this.room.sessionId && playerSprite.anims){
                            if(player.state.y < playerSprite.y){
                                playerSprite.anims.play(share.UP, true);
                            } else {
                                playerSprite.anims.play(share.DOWN, true);
                            }
                        }
                        playerSprite.y = parseFloat(player.state.y);
                    }
                    // player stop action:
                    if(key !== this.room.sessionId && player.mov !== playerSprite.mov && playerSprite.anims){
                        if(!player.mov){
                            playerSprite.anims.stop();
                        }
                        playerSprite.mov = player.mov;
                    }
                    // player change direction action:
                    if(player.state.dir !== playerSprite.dir){
                        playerSprite.dir = player.state.dir;
                        playerSprite.anims.play(player.state.dir, true);
                        playerSprite.anims.stop();
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
        this.room.state.players.onAdd = (player, key) => {
            this.getSceneData(this.room);
            // create current player:
            if(key === this.room.sessionId){
                this.engineStarted = true;
                this.startEngineScene(player, this.room, previousScene);
                let currentScene = this.getActiveScene();
                if(currentScene.key === player.state.scene && currentScene.player && currentScene.player.players){
                    for(let idx in this.playersQueue){
                        let tmp = this.playersQueue[idx];
                        currentScene.player.addPlayer(idx, {x: tmp.x, y: tmp.y, dir: tmp.dir});
                    }
                }
            } else {
                // add new players into the current player scene:
                if(this.engineStarted){
                    let currentScene = this.getActiveScene();
                    if(currentScene.key === player.state.scene && currentScene.player && currentScene.player.players){
                        currentScene.player.addPlayer(key, {x: player.state.x, y: player.state.y, dir: player.state.dir});
                    }
                } else {
                    this.playersQueue[key] = {x: player.state.x, y: player.state.y, dir: player.state.dir};
                }
            }
        };
        // create players or change scenes:
        this.room.onMessage((message) => {
            this.getSceneData(this.room);
            if(message.act === share.CHANGED_SCENE && message.scene === this.room.name && this.room.sessionId !== message.id){
                let currentScene = this.getActiveScene();
                // if other users enter in the current scene we need to add them:
                let {id, x, y, dir} = message;
                currentScene.player.addPlayer(id, {x: x, y: y, dir: dir});
            }
            // @NOTE: here we don't need to evaluate the id since the reconnect only is sent to the current client.
            if(message.act === share.RECONNECT){
                this.gameClient.reconnectGameClient(message, this.room);
            }
            // chat events:
            let uiScene = this.gameEngine.uiScene;
            // @TODO: move CHAT.
            if(uiScene && message.act === chatConst.CHAT_ACTION){
                let readPanel = uiScene.uiChat.getChildByProperty('id', chatConst.CHAT_MESSAGES);
                if(readPanel){
                    readPanel.innerHTML += `${message[chatConst.CHAT_FROM]}: ${message[chatConst.CHAT_MESSAGE]}<br/>`;
                    readPanel.scrollTo(0, readPanel.scrollHeight);
                }
            }

            // @TODO: remove statsDisplayed, check why stats are been created more than once.
            // @NOTE: stats interface like the chat should be created once when the game is initialized.
            if(message.act === share.PLAYER_STATS && !this.gameEngine.statsDisplayed){
                let currentScene = this.getActiveScene();
                if(currentScene.player && currentScene.player.players.hasOwnProperty(room.sessionId)){
                    let playerSprite = currentScene.player.players[room.sessionId];
                    playerSprite.stats = message.stats;
                }
                if(uiScene && uiScene.hasOwnProperty('uiBoxPlayerStats')){
                    let statsBox = uiScene.uiBoxPlayerStats.getChildByProperty('id', 'box-player-stats');
                    let statsButton = uiScene.uiBoxPlayerStats.getChildByProperty('id', 'player-stats-btn');
                    let statsPanel = uiScene.uiBoxPlayerStats.getChildByProperty('id', 'player-stats-container');
                    if(statsButton && statsPanel){
                        // @TODO: stats labels will be part of the configuration in the database.
                        // @TODO: remove the HTML from here.
                        statsPanel.innerHTML = `<span class="stat-label">hp:</span><span class="stat-value">${message.stats.hp}</span>
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
                        this.gameEngine.statsDisplayed = true;
                    }
                }
            }
        });
        this.room.onLeave((code) => {
            if (code > 1000) {
                // server error, disconnection:
                alert('There was a connection error.');
                window.location.reload();
            } else {
                // the client has initiated the disconnection, remove the scene:
                // this.gameEngine.scene.remove(this.roomName);
            }
        });
    }

    // @TODO: re-implement in features.
    registerChat()
    {
        // @TODO: temporal fix, analyze the issue, probably related to the first event attached to the input.
        // @NOTE: the issue seems to be that the register chat like the player stats runs every time the scene is
        // created, which runs multiple times and we only need to register the chat and the stats once and then when
        // the scene changes we only need to update the events or the contents if required.
        if(this.gameClient.hasOwnProperty('room') && this.gameClient.room.id !== this.room.id){
            this.room = this.gameClient.room;
        }
        let uiScene = this.gameEngine.uiScene;
        let chatInput = uiScene.uiChat.getChildByProperty('id', chatConst.CHAT_INPUT);
        let chatSendButton = uiScene.uiChat.getChildByProperty('id', chatConst.CHAT_SEND_BUTTON);
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
        let messageData = {act: chatConst.CHAT_ACTION, m: chatInput.value};
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
            if(this.gameClient.hasOwnProperty('room') && this.room !== this.gameClient.room){
                this.room = this.gameClient.room;
            }
            this.room.send(messageData);
        }
        chatInput.value = '';
    }


    startEngineScene(player, room, previousScene = false)
    {
        let sceneData = this.getSceneData(room);
        let preloaderName = share.SCENE_PRELOADER+sceneData.roomName;
        let uiScene = false;
        if(!this.gameEngine.uiScene){
            uiScene = true;
        }
        // @TODO: implement characters images.
        // , player.username
        let scenePreloader = new ScenePreloader(preloaderName, sceneData.roomMap, sceneData.sceneImages, uiScene);
        if(!this.gameEngine.scene.getScene(preloaderName)){
            this.gameEngine.scene.add(preloaderName, scenePreloader, true);
            let preloader = this.gameEngine.scene.getScene(preloaderName);
            preloader.load.on('complete', () => {
                // set ui on first preloader scene:
                if(!this.gameEngine.uiScene){
                    this.gameEngine.uiScene = preloader;
                    let element = preloader.uiBoxRight.getChildByProperty('className', 'player-name');
                    if(element){
                        element.innerHTML = player.username;
                    }
                }
                this.createEngineScene(player, room, previousScene, sceneData);
            });
        } else {
            this.createEngineScene(player, room, previousScene, sceneData);
        }
    }

    createEngineScene(player, room, previousScene, sceneData)
    {
        if(!this.gameEngine.scene.getScene(player.state.scene)){
            let phaserDynamicScene = new DynamicScene(player.state.scene, sceneData);
            this.gameEngine.scene.add(player.state.scene, phaserDynamicScene, false);
        }
        if(!this.gameEngine.clientRoom){
            this.gameEngine.scene.start(player.state.scene);
        } else {
            if(previousScene){
                this.gameEngine.scene.stop(previousScene);
                this.gameEngine.scene.start(player.state.scene);
            }
        }
        this.gameEngine.clientRoom = room;
        let currentScene = this.gameEngine.scene.getScene(player.state.scene);
        let currentPlayer = new PlayerEngine(currentScene, player);
        currentPlayer.socket = room;
        currentPlayer.playerId = room.sessionId;
        currentPlayer.username = player.username;
        currentScene.player = currentPlayer;
        currentScene.player.create();
        if(room.state.players){
            for(let idx in room.state.players){
                let tmp = room.state.players[idx];
                if(tmp.sessionId && tmp.sessionId !== room.sessionId){
                    currentScene.player.addPlayer(tmp.sessionId, {x: tmp.state.x, y: tmp.state.y, dir: tmp.state.dir});
                }
            }
        }
        // @NOTE: player states must be requested since are private user data that we can share with other players or
        // broadcast to the rooms.
        // request player stats after the player was add to the scene:
        room.send({act: share.PLAYER_STATS});
        // @TODO: re-implement in chat feature.
        // for last register the chat:
        this.registerChat();
        this.room.send({act: share.CLIENT_JOINED});
    }

    getActiveScene()
    {
        if(!this.gameEngine.scene.getScene(this.roomName)){
            if(this.sceneData){
                let phaserDynamicScene = new DynamicScene(this.roomName, this.sceneData);
                this.gameEngine.scene.add(this.roomName, phaserDynamicScene, false);
            }
        }
        return this.gameEngine.scene.getScene(this.roomName);
    }

}

module.exports = RoomEvents;
