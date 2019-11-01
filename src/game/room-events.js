/**
 *
 * Reldens - RoomEvents
 *
 * This class will listen the scene-rooms and run the related actions, it will also register the other modules action
 * into the room events.
 *
 */

const PlayerEngine = require('../users/player-engine');
const SceneDynamic = require('./scene-dynamic');
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
            // do not move the player if is changing scene:
            if(player.state.scene !== this.roomName){
                return;
            }
            this.getSceneData(this.room);
            let currentScene = this.getActiveScene();
            if(currentScene.player && currentScene.player.players.hasOwnProperty(key)){
                // @TODO: test play animation for other players and re-implement current player animation on key press.
                currentScene.player.runPlayerAnimation(key, player);
            }
        };
        this.room.state.players.onRemove = (player, key) => {
            if(key === this.room.sessionId){
                alert('Your session ended, please login again.');
                window.location.reload();
            } else {
                let currentScene = this.getActiveScene();
                if(currentScene.player && currentScene.player.players.hasOwnProperty(key)){
                    // remove your player entity from the game world:
                    currentScene.player.removePlayer(key);
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
            if(
                message.act === share.CHANGED_SCENE
                && message.scene === this.room.name
                && this.room.sessionId !== message.id
            ){
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
        let scenePreloader = this.createPreloaderInstance({
            name: preloaderName,
            map: sceneData.roomMap,
            images: sceneData.sceneImages,
            uiScene: uiScene,
            gameManager: this.gameManager,
            preloadAssets: sceneData.preloadAssets,
            objectsAnimationsData: sceneData.objectsAnimationsData
        });
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
            let engineSceneDynamic = this.createSceneInstance(player.state.scene, sceneData, this.gameManager);
            this.gameEngine.scene.add(player.state.scene, engineSceneDynamic, false);
        }
        if(!this.gameManager.room){
            this.gameEngine.scene.start(player.state.scene);
        } else {
            if(previousScene && this.gameEngine.scene.getScene(previousScene)){
                // destroy previous scene tileset:
                this.gameEngine.scene.getScene(previousScene).changeScene();
                // stop the previous scene and start the new one:
                this.gameEngine.scene.stop(previousScene);
                this.gameEngine.scene.start(player.state.scene);
            }
        }
        this.gameManager.room = room;
        let currentScene = this.gameEngine.scene.getScene(player.state.scene);
        currentScene.player = this.createPlayerEngineInstance(currentScene, player, this.gameManager.config, room);
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

    // @TODO: - Seiyria - in general, do NOT have a function that says "get", but also has a side effect that sets a
    //   variable. this gets _really_ confusing. if you still want to do this, name this function something like
    //   `getsetDefaultSceneData`... just so the function name is clear.
    getSceneData(room)
    {
        if(room.state && (!this.sceneData || room.state !== this.sceneData)){
            this.sceneData = JSON.parse(room.state.sceneData);
        }
        return this.sceneData;
    }

    // @TODO: - Seiyria - this function would really benefit from guards. it's just two nested if statements that could
    //   be moved to the top and cleaned up, like so-
    /*
    if(this.gameEngine.scene.getScene(this.roomName)) return ...;

    if(!this.sceneData) return;

    ...
    */
    getActiveScene()
    {
        if(!this.gameEngine.scene.getScene(this.roomName)){
            if(this.sceneData){
                let engineSceneDynamic = this.createSceneInstance(this.roomName, this.sceneData, this.gameManager);
                this.gameEngine.scene.add(this.roomName, engineSceneDynamic, false);
            }
        }
        return this.gameEngine.scene.getScene(this.roomName);
    }

    createSceneInstance(sceneName, sceneData, gameManager)
    {
        return new SceneDynamic(sceneName, sceneData, gameManager);
    }

    createPlayerEngineInstance(currentScene, player, config, room)
    {
        return new PlayerEngine(currentScene, player, config, room);
    }

    createPreloaderInstance(props)
    {
        return new ScenePreloader(props);
    }

}

module.exports = RoomEvents;
