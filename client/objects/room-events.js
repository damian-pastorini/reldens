const PhaserPlayer = require('./player');
// const SceneDynamic = require('./scene-dynamic');
const share = require('../../shared/constants');

class RoomEvents
{

    constructor(roomName)
    {
        this.roomName = roomName;
    }

    join(gameClient)
    {
        let room = gameClient.join(this.roomName, gameClient.userData);
        return room;
    }

    startListen(room, previousScene = false)
    {
        var self = this;
        // listen to patches coming from the server
        room.listen('players/:id', function(change){
            // remove player on disconnect or logout:
            if (change.operation === 'remove'){
                /* @TODO: since we are removing the player from the room we need to refactor this.
                if(change.path.id == room.sessionId){
                    alert('Your session ended, please login again.');
                    window.location.reload();
                }
                */
                if(change.path.id != room.sessionId){
                    let currentScene = self.getActiveScene();
                    if(currentScene.player.players.hasOwnProperty(change.path.id)){
                        currentScene.player.players[change.path.id].destroy();
                        delete currentScene.player.players[change.path.id];
                    }
                }
            }
        });
        // move other clients:
        room.listen('players/:id/:axis', function(change){
            if(change.path.id != room.sessionId){
                let currentScene = self.getActiveScene();
                if(currentScene.player && currentScene.player.players.hasOwnProperty(change.path.id)){
                    let playerToMove = currentScene.player.players[change.path.id];
                    if(change.path.axis == 'x'){
                        if(change.value < playerToMove.x){
                            playerToMove.anims.play(share.LEFT, true);
                            playerToMove.x = change.value;
                        } else {
                            playerToMove.anims.play(share.RIGHT, true);
                            playerToMove.x = change.value;
                        }
                    }
                    if(change.path.axis == 'y'){
                        if(change.value < playerToMove.y){
                            playerToMove.anims.play(share.UP, true);
                            playerToMove.y = change.value;
                        } else {
                            playerToMove.anims.play(share.DOWN, true);
                            playerToMove.y = change.value;
                        }
                    }
                }
            }
        });
        // stop movement:
        room.listen('players/:id/:attribute', function(change){
            // player stop action:
            if(change.path.id != room.sessionId && change.operation == 'replace' && change.path.attribute == 'mov'){
                let currentScene = self.getActiveScene();
                if(currentScene.player.players.hasOwnProperty(change.path.id)){
                    currentScene.player.players[change.path.id].anims.stop();
                }
            }
            // player change direction action:
            if(change.path.id != room.sessionId && change.path.attribute == 'dir'){
                let currentScene = self.getActiveScene();
                if(currentScene.player && currentScene.player.players.hasOwnProperty(change.path.id)){
                    currentScene.player.players[change.path.id].anims.stop();
                }
            }
        });
        room.onMessage.add(function(message){
            if(message.act == share.CREATE_PLAYER && message.id == room.sessionId){
                // @TODO: this will be implemented after the change rooms in the server side works.
                // var phaserDynamicScene = new DynamicScene(message.player.scene, message.sceneData);
                // phaserGame.scene.add(message.player.scene, phaserDynamicScene, true);
                $('.player-name').html(message.player.username);
                self.startPhaserScene(message, room, previousScene);
            }
            // add other new players into the current scene:
            if(message.act == share.ADD_PLAYER && message.id != room.sessionId){
                let currentScene = self.getActiveScene();
                if(currentScene.key == message.player.scene){
                    currentScene.player.addPlayer(message.id, parseFloat(message.player.x), parseFloat(message.player.y), message.player.dir);
                }
            }
            if(message.act == share.CHANGED_SCENE){
                let currentScene = self.getActiveScene();
                // if other users enter in the current scene we need to add them:
                if(message.scene == currentScene.key && currentScene.player.playerId != message.id){
                    currentScene.player.addPlayer(message.id, message.x, message.y, message.dir);
                }
            }
            if(message.act == share.RECONNET){
                gameClient.reconnectColyseus(message, room);
            }
        });
        room.onError.add(function(data){
            alert('There was a connection error.');
            window.location.reload();
        });
        this.room = room;
    }

    startPhaserScene(message, room, previousScene = false)
    {
        if(!phaserGame.colyseusRoom){
            phaserGame.scene.start(message.player.scene);
        }
        phaserGame.colyseusRoom = room;
        var currentScene = phaserGame.scene.getScene(message.player.scene);
        var playerPos = {x: parseFloat(message.player.x), y: parseFloat(message.player.y), direction: message.player.dir};
        var currentPlayer = new PhaserPlayer(currentScene, message.player.scene, playerPos);
        currentPlayer.socket = room;
        currentPlayer.playerId = room.sessionId;
        currentPlayer.username = message.player.username;
        currentScene.player = currentPlayer;
        currentScene.player.create();
        for(let p in room.state.players){
            let tmp = room.state.players[p];
            if(tmp.sessionId && tmp.sessionId != room.sessionId){
                currentScene.player.addPlayer(tmp.sessionId, tmp.x, tmp.y, tmp.dir);
            }
        }
    }

    getActiveScene()
    {
        // default scene:
        let currentScene = share.TOWN;
        if(phaserGame.currentScene){
            currentScene = phaserGame.currentScene;
        }
        return phaserGame.scene.getScene(currentScene);
    }

}

module.exports = RoomEvents;
