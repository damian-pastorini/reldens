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
        this.roomName = roomName;
        this.sceneData = false;
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
        // listen to changes coming from the server:
        room.state.players.onChange = (player, key) => {
            // do not move player if is changing scene:
            if(player.scene !== this.roomName){
                return;
            }
            this.getSceneData(room);
            let currentScene = this.getActiveScene();
            if(currentScene.player && currentScene.player.players.hasOwnProperty(key)){
                let playerToMove = currentScene.player.players[key];
                if(playerToMove){
                    // @TODO: improve the implementation using client physics for prediction.
                    // See NEXT items in Road Map: https://github.com/damian-pastorini/reldens/wiki/Road-Map
                    // @NOTE: we commented the speed since the body position is given by the body speed in
                    // the server, this is to prevent client hacks.
                    if(player.x !== playerToMove.x){
                        if(key !== room.sessionId && playerToMove.anims){
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
                        if(key !== room.sessionId && playerToMove.anims){
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
                    if(key !== room.sessionId && player.mov !== playerToMove.mov && playerToMove.anims){
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
        room.state.players.onRemove = (player, key) => {
            if(key === room.sessionId){
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
        room.onMessage.add((message) => {
            this.getSceneData(room);
            if(message.act === share.ADD_PLAYER){
                // create current player:
                if(message.id === room.sessionId){
                    this.startPhaserScene(message, room, previousScene);
                }
                // add new players into the current player scene:
                if(message.id !== room.sessionId){
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
            if(message.act === share.CHANGED_SCENE && message.scene === room.name && room.sessionId !== message.id){
                let currentScene = this.getActiveScene();
                // if other users enter in the current scene we need to add them:
                let {id, x, y, dir} = message;
                currentScene.player.addPlayer(id, x, y, dir);
            }
            // @NOTE: here we don't need to evaluate the id since the reconnect only is sent to the current client.
            if(message.act === share.RECONNECT){
                this.colyseusClient.reconnectColyseus(message, room);
            }
        });
        room.onError.add((data) => {
            alert('There was a connection error.');
            console.log(data);
            window.location.reload();
        });
        this.room = room;
    }

    registerChat()
    {
        // @TODO: replace elements direct reference with a client object integration, see above for jQuery reference.
        let chatForm = document.getElementById(share.CHAT);
        let readPanel = document.getElementById('messages');
        chatForm.onsubmit = (e) => {
            e.preventDefault();
            let message = document.getElementById('message');
            this.room.send(share.CHAT, message.value);
            message.value = '';
        };
        this.room.onMessage.add((message) => {
            if(message.act === share.CHAT){
                readPanel.innerHTML += `${message.fromUser}: ${message.text}<br>`;
                readPanel.scrollTo(0, message.scrollHeight);
            }
        });
    }

    startPhaserScene(message, room, previousScene = false)
    {
        let sceneData = this.getSceneData(room);
        let preloaderName = share.SCENE_PRELOADER+sceneData.sceneName;
        let scenePreloader = new ScenePreloader(preloaderName, sceneData.sceneMap, sceneData.sceneKey);
        if(!this.phaserGame.scene.getScene(preloaderName)){
            this.phaserGame.scene.add(preloaderName, scenePreloader, true);
            let preloader = this.phaserGame.scene.getScene(preloaderName);
            preloader.load.on('complete', () => {
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
