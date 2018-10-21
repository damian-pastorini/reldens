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
        let room = gameClient.join(this.roomName, gameClient.userData);
        return room;
    }

    startListen(room, previousScene = false)
    {
        const self = this;
        // listen to patches coming from the server
        room.listen('players/:id', function(change){
            // Note: in case an state update comes before the player creation we create the scene based.
            if(!self.sceneData){
                self.sceneData = room.state.sceneData;
            }
            // console.log('change-A: ', change);
            // remove player on disconnect or logout:
            if (change.operation === 'remove'){
                /* @TODO: since we are removing the player from the room we need to refactor this.
                if(change.path.id == room.sessionId){
                    alert('Your session ended, please login again.');
                    window.location.reload();
                }
                */
                let currentScene = self.getActiveScene();
                if(currentScene.player.players.hasOwnProperty(change.path.id)){
                    currentScene.player.players[change.path.id].destroy();
                    delete currentScene.player.players[change.path.id];
                }
            }
        });
        // move other clients:
        room.listen('players/:id/:axis', function(change){
            // Note: in case an state update comes before the player creation we create the scene based.
            if(!self.sceneData){
                self.sceneData = room.state.sceneData;
            }
            // console.log('change-B: ', change);
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
            // Note: in case an state update comes before the player creation we create the scene based.
            if(!self.sceneData){
                self.sceneData = room.state.sceneData;
            }
            // console.log('change-C: ', change);
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
                $('.player-name').html(message.player.username);
                self.startPhaserScene(message, room, previousScene);
            }
            // add other new players into the current scene:
            if(message.act == share.ADD_PLAYER && message.id != room.sessionId){
                let currentScene = self.getActiveScene();
                if(currentScene.key == message.player.scene){
                    if(currentScene.player && currentScene.player.players){
                        currentScene.player.addPlayer(message.id, parseFloat(message.player.x), parseFloat(message.player.y), message.player.dir);
                    }
                }
            }
            if(message.act == share.CHANGED_SCENE && message.scene == room.name && room.sessionId != message.id){
                let currentScene = self.getActiveScene();
                // if other users enter in the current scene we need to add them:
                currentScene.player.addPlayer(message.id, message.x, message.y, message.dir);
            }
            // NOTE: here we don't need to evaluate the id since the reconnect only is sent to the current client.
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
        if(!phaserGame.scene.getScene(message.player.scene)){
            let phaserDynamicScene = new DynamicScene(message.player.scene, room.state.sceneData);
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
        var currentScene = phaserGame.scene.getScene(message.player.scene);
        let playerPos = {x: parseFloat(message.player.x), y: parseFloat(message.player.y), direction: message.player.dir};
        let currentPlayer = new PhaserPlayer(currentScene, message.player.scene, playerPos);
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
