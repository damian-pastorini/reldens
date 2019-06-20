const PhaserPlayer = require('./player');
const DynamicScene = require('./scene-dynamic');
const share = require('../../shared/constants');

class RoomEvents
{

    constructor(roomName)
    {
        this.roomName = roomName;
        this.sceneData = false;
    }

    join(gameClient)
    {
        // return room:
        return gameClient.join(this.roomName, gameClient.userData);
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
                    if(player.x !== playerToMove.x){
                        if(key !== room.sessionId && playerToMove.anims){
                            if(player.x < playerToMove.x){
                                playerToMove.anims.play(share.LEFT, true);
                                // @NOTE: we commented the speed here since the body position is given by the body speed
                                // in the server. This is a temporal implementation to prevent client hacks.
                                // @TODO: improve the implementation, use client physics for prediction.
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
                    // @TODO: fix animation stop.
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
            // ---------------------------------------------
        };
        room.state.players.onRemove = (player, key) => {
            // @TODO: since we are removing the player from the room we need to refactor this.
            // if(key === room.sessionId){
            //     alert('Your session ended, please login again.');
            //     window.location.reload();
            // }
            let currentScene = this.getActiveScene();
            if(currentScene.player.players.hasOwnProperty(key)){
                currentScene.player.players[key].destroy();
                delete currentScene.player.players[key];
            }
            // remove your player entity from the game world!
        };
        // create players or change scenes:
        room.onMessage.add((message) => {
            this.getSceneData(room);
            if(message.act === share.ADD_PLAYER){
                // create current player:
                if(message.id === room.sessionId){
                    // @TODO: remove jQuery reference, create a client object and require it to update the game view.
                    $('.player-name').html(message.player.username);
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
                gameClient.reconnectColyseus(message, room);
            }
        });
        room.onError.add((data) => {
            alert('There was a connection error.');
            // @TODO: check if is worth it to send the error data to log the error in the server.
            // console.log(data);
            window.location.reload();
        });
        this.room = room;
    }

    startPhaserScene(message, room, previousScene = false)
    {
        if(!phaserGame.scene.getScene(message.player.scene)){
            let phaserDynamicScene = new DynamicScene(message.player.scene, this.getSceneData(room));
            phaserGame.scene.add(message.player.scene, phaserDynamicScene, false);
        }
        if(!phaserGame.colyseusRoom){
            phaserGame.scene.start(message.player.scene);
        } else {
            if(previousScene){
                phaserGame.scene.stop(previousScene);
                phaserGame.scene.start(message.player.scene);
            }
        }
        phaserGame.colyseusRoom = room;
        let currentScene = phaserGame.scene.getScene(message.player.scene);
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
        if(!phaserGame.scene.getScene(this.roomName)){
            if(this.sceneData){
                let phaserDynamicScene = new DynamicScene(this.roomName, this.sceneData);
                phaserGame.scene.add(this.roomName, phaserDynamicScene, false);
            }
        }
        return phaserGame.scene.getScene(this.roomName);
    }

}

module.exports = RoomEvents;
