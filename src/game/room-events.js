/**
 *
 * Reldens - RoomEvents
 *
 * This class will listen the scene-rooms and run the related actions, it will also register the other modules action
 * into the room events.
 *
 */

const PlayerEngine = require('../users/player-engine');
const DynamicScene = require('./scene-dynamic');
const ScenePreloader = require('./scene-preloader');
const share = require('../utils/constants');

class RoomEvents
{

    constructor(roomName, gameManager)
    {
        this.gameManager = gameManager;
        this.gameClient = gameManager.gameClient;
        this.gameEngine = gameManager.gameEngine;
        this.room = false;
        this.roomName = roomName;
        this.sceneData = false;
        this.playersQueue = {};
    }

    activateRoom(room, previousScene = false)
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
                    if(player.state.x !== playerSprite.x && playerSprite.anims){
                        if(player.state.x < playerSprite.x){
                            playerSprite.anims.play(share.LEFT, true);
                        } else {
                            playerSprite.anims.play(share.RIGHT, true);
                        }
                        playerSprite.x = parseFloat(player.state.x);
                    }
                    if(player.state.y !== playerSprite.y && playerSprite.anims){
                        if(player.state.y < playerSprite.y){
                            playerSprite.anims.play(share.UP, true);
                        } else {
                            playerSprite.anims.play(share.DOWN, true);
                        }
                        playerSprite.y = parseFloat(player.state.y);
                    }
                    // player stop action:
                    if(player.mov !== playerSprite.mov && playerSprite.anims){
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
                this.gameManager.reconnectGameClient(message, this.room);
            }
            // @NOTE: now this method will update the stats every time the stats action is received but the UI will be
            // created only once in the preloader.
            if(message.act === share.PLAYER_STATS){
                this.activatePlayerStats(message);
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
        // @NOTE: here we attach features onMessage actions for the events on the scene-rooms, we may need to do this
        // for every room state change, not only for onMessage but for room.state.onChange, onRemove, onAdd as well.
        this.gameManager.features.attachOnMessageObserversToRoom(this);
    }

    activatePlayerStats(message)
    {
        let uiScene = this.gameEngine.uiScene;
        let currentScene = this.getActiveScene();
        if(currentScene.player && currentScene.player.players.hasOwnProperty(this.room.sessionId)){
            let playerSprite = currentScene.player.players[this.room.sessionId];
            playerSprite.stats = message.stats;
        }
        if(uiScene && uiScene.hasOwnProperty('uiBoxPlayerStats')){
            let statsPanel = uiScene.uiBoxPlayerStats.getChildByProperty('id', 'player-stats-container');
            if(statsPanel){
                let messageTemplate = uiScene.cache.html.get('playerStats');
                // @TODO: stats types will be part of the configuration in the database.
                statsPanel.innerHTML = this.gameManager.gameEngine.TemplateEngine.render(messageTemplate, {
                    stats: message.stats
                });
            }
        }
    }

    startEngineScene(player, room, previousScene = false)
    {
        let sceneData = this.getSceneData(room);
        let preloaderName = share.SCENE_PRELOADER+sceneData.roomName;
        let uiScene = false;
        if(!this.gameEngine.uiScene){
            uiScene = true;
        }
        // @TODO: implement player custom avatar.
        // , player.username
        let scenePreloader = new ScenePreloader(preloaderName, sceneData.roomMap, sceneData.sceneImages, uiScene, this.gameManager);
        if(!this.gameEngine.scene.getScene(preloaderName)){
            this.gameEngine.scene.add(preloaderName, scenePreloader, true);
            let preloader = this.gameEngine.scene.getScene(preloaderName);
            preloader.load.on('complete', () => {
                // set ui on first preloader scene:
                if(!this.gameEngine.uiScene){
                    // assign the preloader:
                    this.gameEngine.uiScene = preloader;
                    // if the box right is present then assign the actions:
                    if(preloader.uiBoxRight){
                        let element = preloader.uiBoxRight.getChildByProperty('className', 'player-name');
                        if(element){
                            element.innerHTML = player.username;
                        }
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
            let phaserDynamicScene = new DynamicScene(player.state.scene, sceneData, this.gameManager.config);
            this.gameEngine.scene.add(player.state.scene, phaserDynamicScene, false);
        }
        if(!this.gameManager.room){
            this.gameEngine.scene.start(player.state.scene);
        } else {
            if(previousScene){
                this.gameEngine.scene.stop(previousScene);
                this.gameEngine.scene.start(player.state.scene);
            }
        }
        this.gameManager.room = room;
        let currentScene = this.gameEngine.scene.getScene(player.state.scene);
        let currentPlayer = new PlayerEngine(currentScene, player, this.gameManager.config);
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
        // update any ui if needed, this event happens once for every scene:
        let uiScene = this.gameEngine.uiScene;
        // if scene label is visible assign the data to the box:
        if(uiScene.hasOwnProperty('uiSceneLabel')){
            let element = uiScene.uiSceneLabel.getChildByProperty('className', 'scene-label');
            if(element){
                element.innerHTML = this.getSceneData(room).roomTitle;
            }
        }
        // @NOTE: player states must be requested since are private user data that we can share with other players or
        // broadcast to the rooms.
        // request player stats after the player was added to the scene:
        this.room.send({act: share.PLAYER_STATS});
        // send notification about client joined:
        this.room.send({act: share.CLIENT_JOINED});
    }

    getSceneData(room)
    {
        if(room.state && (!this.sceneData || room.state !== this.sceneData)){
            this.sceneData = JSON.parse(room.state.sceneData);
        }
        return this.sceneData;
    }

    getActiveScene()
    {
        if(!this.gameEngine.scene.getScene(this.roomName)){
            if(this.sceneData){
                let phaserDynamicScene = new DynamicScene(this.roomName, this.sceneData, this.gameManager.config);
                this.gameEngine.scene.add(this.roomName, phaserDynamicScene, false);
            }
        }
        return this.gameEngine.scene.getScene(this.roomName);
    }

}

module.exports = RoomEvents;
