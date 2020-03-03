/**
 *
 * Reldens - RoomEvents
 *
 * This class will listen the scene-rooms and run the related actions, it will also register the other modules action
 * into the room events.
 *
 */

const { PlayerEngine } = require('../../users/client/player-engine');
const { SceneDynamic } = require('./scene-dynamic');
const { ScenePreloader } = require('./scene-preloader');
const { GameConst } = require('../constants');
const { EventsManager } = require('../events-manager');

class RoomEvents
{

    constructor(roomName, gameManager)
    {
        this.room = false;
        this.sceneData = false;
        this.scenePreloader = false;
        this.playersQueue = {};
        this.gameManager = gameManager;
        this.gameEngine = gameManager.gameEngine;
        this.roomName = roomName;
        this.objectsUi = {};
    }

    activateRoom(room, previousScene = false)
    {
        EventsManager.emit('reldens.activateRoom', room, this.gameManager);
        this.room = room;
        // listen to changes coming from the server:
        this.room.state.players.onAdd = (player, key) => {
            if(this.room.state && (!this.sceneData || this.room.state !== this.sceneData)){
                this.prepareScene();
            }
            this.playersOnAdd(player, key, previousScene);
        };
        this.room.state.players.onChange = (player, key) => {
            this.playersOnChange(player, key);
        };
        this.room.state.players.onRemove = (player, key) => {
            this.playersOnRemove(player, key);
        };
        // create players or change scenes:
        this.room.onMessage((message) => {
            this.roomOnMessage(message);
        });
        this.room.onLeave((code) => {
            this.roomOnLeave(code);
        });
    }

    playersOnAdd(player, key, previousScene)
    {
        EventsManager.emit('reldens.playersOnAdd', player, key, previousScene, this);
        // create current player:
        if(key === this.room.sessionId){
            this.engineStarted = true;
            this.startEngineScene(player, this.room, previousScene);
            let currentScene = this.getActiveScene();
            if(currentScene.key === player.state.scene && currentScene.player && currentScene.player.players){
                for(let idx in this.playersQueue){
                    let { x, y, dir, username } = this.playersQueue[idx];
                    currentScene.player.addPlayer(idx, { x, y, dir, username: username });
                }
            }
        } else {
            // add new players into the current player scene:
            if(this.engineStarted){
                let currentScene = this.getActiveScene();
                if(currentScene.key === player.state.scene && currentScene.player && currentScene.player.players){
                    let { x, y, dir } = player.state;
                    currentScene.player.addPlayer(key, { x, y, dir, username: player.username });
                }
            } else {
                let { x, y, dir } = player.state;
                this.playersQueue[key] = { x, y, dir, username: player.username };
            }
        }
    }

    prepareScene()
    {
        this.sceneData = JSON.parse(this.room.state.sceneData);
        if(!this.gameEngine.scene.getScene(this.roomName)){
            let engineSceneDynamic = this.createSceneInstance(this.roomName, this.sceneData, this.gameManager);
            this.gameEngine.scene.add(this.roomName, engineSceneDynamic, false);
        }
    }

    playersOnChange(player, key)
    {
        // do not move the player if is changing scene:
        if(player.state.scene !== this.roomName){
            return;
        }
        let currentScene = this.getActiveScene();
        if(currentScene.player && {}.hasOwnProperty.call(currentScene.player.players, key)){
            currentScene.player.runPlayerAnimation(key, player);
        }
    }

    playersOnRemove(player, key)
    {
        EventsManager.emit('reldens.playersOnRemove', player, key, this);
        if(key === this.room.sessionId){
            // @TODO: improve disconnection handler.
            if(!this.gameManager.gameOver){
                alert('Your session ended, please login again.');
            }
            window.location.reload();
        } else {
            let currentScene = this.getActiveScene();
            if(currentScene.player && {}.hasOwnProperty.call(currentScene.player.players, key)){
                // remove your player entity from the game world:
                currentScene.player.removePlayer(key);
            }
        }
    }

    roomOnMessage(message)
    {
        if(message.act === GameConst.GAME_OVER){
            EventsManager.emit('reldens.gameOver', message, this);
            this.gameManager.gameOver = true;
            alert('You died!');
        }
        if(
            message.act === GameConst.CHANGED_SCENE
            && message.scene === this.room.name
            && this.room.sessionId !== message.id
        ){
            EventsManager.emit('reldens.changedScene', message, this);
            let currentScene = this.getActiveScene();
            // if other users enter in the current scene we need to add them:
            let {id, x, y, dir, username} = message;
            currentScene.player.addPlayer(id, {x, y, dir, username});
        }
        // @NOTE: here we don't need to evaluate the id since the reconnect only is sent to the current client.
        if(message.act === GameConst.RECONNECT){
            EventsManager.emit('reldens.beforeReconnectGameClient', message, this);
            this.gameManager.reconnectGameClient(message, this.room);
        }
        // @NOTE: now this method will update the stats every time the stats action is received but the UI will be
        // created only once in the preloader.
        if(message.act === GameConst.PLAYER_STATS){
            EventsManager.emit('reldens.playerStatsUpdate', message, this);
            this.updatePlayerStats(message);
        }
        if(message.act === GameConst.UI && message.id){
            EventsManager.emit('reldens.initUi', message, this);
            this.initUi(message);
        }
        if(message.act === GameConst.ATTACK){
            // @TODO: improve.
            EventsManager.emit('reldens.playerAttack', message, this);
            let currentScene = this.getActiveScene();
            if(!currentScene.player){
                return;
            }
            let attackerSprite = false;
            let defenderSprite = false;
            let isPvP = (!{}.hasOwnProperty.call(message, 'type') || message.type === 'pvp');
            if(isPvP){
                attackerSprite = currentScene.player.players[message.atk];
                defenderSprite = currentScene.player.players[message.def];
            } else {
                if({}.hasOwnProperty.call(currentScene.objectsAnimations, message.atk)){
                    attackerSprite = currentScene.objectsAnimations[message.atk].sceneSprite;
                    defenderSprite = currentScene.player.players[message.def];
                }
                if({}.hasOwnProperty.call(currentScene.objectsAnimations, message.def)){
                    defenderSprite = currentScene.objectsAnimations[message.def].sceneSprite;
                    attackerSprite = currentScene.player.players[message.atk];
                }
            }
            if(attackerSprite){
                let attackSprite = currentScene.physics.add.sprite(attackerSprite.x, attackerSprite.y, GameConst.ATTACK);
                attackSprite.anims.play(GameConst.ATTACK, true).on('animationcomplete', () => {
                    attackSprite.destroy();
                });
            }
            if(defenderSprite){
                let hitSprite = currentScene.physics.add.sprite(defenderSprite.x, defenderSprite.y, GameConst.HIT);
                hitSprite.setDepth(200000);
                hitSprite.anims.play(GameConst.HIT, true).on('animationcomplete', () => {
                    hitSprite.destroy();
                });
            }
        }
    }

    roomOnLeave(code)
    {
        // @TODO: improve disconnection handler.
        if(code > 1000){
            // server error, disconnection:
            if(!this.gameManager.gameOver){
                alert('There was a connection error.');
            }
            window.location.reload();
        } else {
            // the client has initiated the disconnection:
            // @TODO: test a lost connection case (like turn of the network, but probably the browser was just closed),
            //   in which case should we remove the scene? Again, force restart the client?
            //   this.gameEngine.scene.remove(this.roomName);
            //   window.location.reload();
        }
    }

    updatePlayerStats(message)
    {
        let currentScene = this.getActiveScene();
        if(!currentScene.player || !{}.hasOwnProperty.call(currentScene.player.players, this.room.sessionId)){
            return;
        }
        let playerSprite = currentScene.player.players[this.room.sessionId];
        playerSprite.stats = message.stats;
        this.gameManager.playerData.stats = message.stats;
        let uiScene = this.gameEngine.uiScene;
        if(uiScene && {}.hasOwnProperty.call(uiScene, 'uiPlayerStats')){
            let statsPanel = uiScene.uiPlayerStats.getChildByProperty('id', 'player-stats-container');
            if(statsPanel){
                let messageTemplate = uiScene.cache.html.get('playerStats');
                // @TODO: stats types will be part of the configuration in the database.
                statsPanel.innerHTML = this.gameManager.gameEngine.parseTemplate(messageTemplate, {
                    stats: message.stats
                });
            }
        }
        if(this.gameManager.config.get('client/ui/uiLifeBar/enabled')){
            currentScene.player.redrawLifeBar();
        }
    }

    initUi(props)
    {
        let uiScene = this.gameEngine.uiScene;
        if(uiScene && {}.hasOwnProperty.call(uiScene.userInterfaces, props.id)){
            let uiBox = uiScene.userInterfaces[props.id];
            if(props.title){
                let boxTitle = uiBox.getChildByProperty('className', 'box-title');
                if(boxTitle){
                    boxTitle.innerHTML = props.title;
                }
            }
            if(props.content){
                let boxContent = uiBox.getChildByProperty('className', 'box-content');
                if(boxContent){
                    boxContent.innerHTML = props.content;
                    // @TODO: IMPROVE! I need time to focus on this which I don't have right now :(
                    if(props.options){
                        for(let idx in props.options){
                            let {label, value} = props.options[idx];
                            let buttonTemplate = uiScene.cache.html.get('uiButton');
                            let templateVars = {id: idx, object_id: props.id, label, value};
                            let buttonHtml = this.gameManager.gameEngine.parseTemplate(buttonTemplate, templateVars);
                            boxContent.innerHTML += buttonHtml;
                            // @TODO: temporal fix to avoid rendering time issue.
                            setTimeout(()=>{
                                let buttonElement = boxContent.querySelector('#opt-'+idx+'-'+props.id);
                                buttonElement.addEventListener('click', (event) => {
                                    let optionSend = {
                                        id: props.id,
                                        act: GameConst.BUTTON_OPTION,
                                        value: event.originalTarget.getAttribute('data-option-value')
                                    };
                                    this.room.send(optionSend);
                                });
                            }, 0);
                        }
                    }

                }
            }
            let dialogContainer = uiBox.getChildByID('box-'+props.id);
            dialogContainer.style.display = 'block';
            // set box depth over the other boxes:
            uiBox.setDepth(2);
            // on dialog display clear the current target:
            if(this.gameManager.config.get('client/ui/uiTarget/hideOnDialog')){
                this.gameEngine.clearTarget();
            }
        }
    }

    startEngineScene(player, room, previousScene = false)
    {
        EventsManager.emit('reldens.startEngineScene', this, player, room, previousScene);
        let uiScene = false;
        if(!this.gameEngine.uiScene){
            uiScene = true;
        }
        let preloaderName = GameConst.SCENE_PRELOADER+this.sceneData.roomName;
        // @TODO: implement player custom avatar.
        // , player.username
        if(!this.gameEngine.scene.getScene(preloaderName)){
            this.scenePreloader = this.createPreloaderInstance({
                name: preloaderName,
                map: this.sceneData.roomMap,
                images: this.sceneData.sceneImages,
                uiScene: uiScene,
                gameManager: this.gameManager,
                preloadAssets: this.sceneData.preloadAssets,
                objectsAnimationsData: this.sceneData.objectsAnimationsData
            });
            this.gameEngine.scene.add(preloaderName, this.scenePreloader, true);
            EventsManager.emit('reldens.createdPreloaderInstance', this, this.scenePreloader);
            let preloader = this.gameEngine.scene.getScene(preloaderName);
            preloader.load.on('complete', () => {
                // set ui on first preloader scene:
                if(!this.gameEngine.uiScene){
                    // assign the preloader:
                    this.gameEngine.uiScene = preloader;
                    // if the box right is present then assign the actions:
                    if(preloader.uiPlayer){
                        let element = preloader.uiPlayer.getChildByProperty('className', 'player-name');
                        if(element){
                            element.innerHTML = player.username;
                        }
                    }
                }
                this.createEngineScene(player, room, previousScene);
            });
        } else {
            let currentScene = this.getActiveScene();
            currentScene.objectsAnimationsData = this.sceneData.objectsAnimationsData;
            this.scenePreloader = this.gameEngine.scene.getScene(preloaderName);
            EventsManager.emit('reldens.createdPreloaderRecurring', this, this.scenePreloader);
            this.createEngineScene(player, room, previousScene);
        }
    }

    createEngineScene(player, room, previousScene)
    {
        EventsManager.emit('reldens.createEngineScene', player, room, previousScene, this);
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
        currentScene.player = this.createPlayerEngineInstance(currentScene, player, this.gameManager, room);
        currentScene.player.create();
        if(room.state.players){
            for(let idx in room.state.players){
                let tmp = room.state.players[idx];
                if(tmp.sessionId && tmp.sessionId !== room.sessionId){
                    let { x, y, dir } = tmp.state;
                    currentScene.player.addPlayer(tmp.sessionId, { x, y, dir, username: tmp.username });
                }
            }
        }
        // update any ui if needed, this event happens once for every scene:
        let uiScene = this.gameEngine.uiScene;
        // if scene label is visible assign the data to the box:
        if({}.hasOwnProperty.call(uiScene, 'uiSceneLabel')){
            let element = uiScene.uiSceneLabel.getChildByProperty('className', 'scene-label');
            if(element){
                element.innerHTML = this.sceneData.roomTitle;
            }
        }
        // @NOTE: player states must be requested since are private user data that we can share with other players or
        // broadcast to the rooms.
        // request player stats after the player was added to the scene:
        this.room.send({act: GameConst.PLAYER_STATS});
        // send notification about client joined:
        this.room.send({act: GameConst.CLIENT_JOINED});
    }

    getActiveScene()
    {
        return this.gameEngine.scene.getScene(this.roomName);
    }

    createSceneInstance(sceneName, sceneData, gameManager)
    {
        return new SceneDynamic(sceneName, sceneData, gameManager);
    }

    createPlayerEngineInstance(currentScene, player, gameManager, room)
    {
        return new PlayerEngine(currentScene, player, gameManager, room);
    }

    createPreloaderInstance(props)
    {
        return new ScenePreloader(props);
    }

}

module.exports.RoomEvents = RoomEvents;
