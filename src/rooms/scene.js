/**
 *
 * Reldens - RoomScene
 *
 * This class will handle the scenes data and interactions between client scenes and server rooms.
 *
 */

const RoomLogin = require('./login');
const State = require('../server/state');
const share = require('../utils/constants');
const P2world = require('../world/p2world');
// @TODO: move chat to features.
// const ChatHelper = require('../chat/chat-helper');

class RoomScene extends RoomLogin
{

    onCreate(options)
    {
        // data server:
        super.onCreate(options);
        // this.roomId = options.room.roomId;
        console.log('INFO - INIT ROOM:', this.roomName);
        // @NOTE: sceneId seems to be used only for chat.
        // this.sceneId = options.scene.roomId;
        // @NOTE: in the future not all the scene information will be sent to the client. This is because we could have
        // hidden information to be discovered.
        // @TODO: move chat to features.
        // this.chatHelper = new ChatHelper;
        let roomState = new State(options.room);
        this.setState(roomState);
        // create world:
        this.createWorld(options.room);
    }

    onJoin(client, options, authResult)
    {
        // check if user is already logged and disconnect from the previous client:
        let loggedUserFound = false;
        if(this.state.players){
            for(let playerIdx in this.state.players){
                let player = this.state.players[playerIdx];
                if(player.username === options.username){
                    loggedUserFound = true;
                    let promSave = this.savePlayerState(player.sessionId);
                    if(promSave !== false){
                        promSave.then((rows) => {
                            // first remove player body from current world:
                            let playerToRemove = this.getPlayerFromState(player.sessionId);
                            playerToRemove.isBusy = false;
                            if(playerToRemove){
                                // get body:
                                let bodyToRemove = playerToRemove.p2body;
                                if(bodyToRemove){
                                    // remove body:
                                    this.p2world.removeBody(bodyToRemove);
                                }
                                // remove player:
                                this.state.removePlayer(player.sessionId);
                            }
                            // old player session removed, create it again:
                            this.createPlayer(client, authResult);
                        }).catch((err) => {
                            console.log('ERROR - Player save error:', err);
                        });
                    }
                    break;
                }
            }
        }
        if(!loggedUserFound){
            // player not logged, create it:
            this.createPlayer(client, authResult);
        }
    }

    createPlayer(client, authResult)
    {
        // player creation:
        let currentPlayer = this.state.createPlayer(client.sessionId, authResult);
        // create body for server physics and assign the body to the player:
        currentPlayer.p2body = this.p2world.createPlayerBody({
            id: client.sessionId,
            width: this.config.server.players.size.width,
            height: this.config.server.players.size.height,
            x: currentPlayer.state.x,
            y: currentPlayer.state.y,
        });
    }

    onLeave(client, consented)
    {
        let currentPlayer = this.getPlayerFromState(client.sessionId);
        if(currentPlayer){
            this.saveStateAndRemovePlayer(client.sessionId);
        }
    }

    onMessage(client, data)
    {
        // get player:
        let currentPlayer = this.getPlayerFromState(client.sessionId);
        if(currentPlayer && currentPlayer.hasOwnProperty('p2body')){
            // get player body:
            let bodyToMove = currentPlayer.p2body;
            // if player is moving:
            if(data.hasOwnProperty('dir') && bodyToMove){
                // @TODO: multiple keys press will be part of the configuration in the database.
                // if body is moving then avoid multiple key press at the same time:
                if(data.dir === share.RIGHT && bodyToMove.velocity[1] === 0){
                    bodyToMove.velocity[0] = share.SPEED_SERVER;
                }
                if(data.dir === share.LEFT && bodyToMove.velocity[1] === 0){
                    bodyToMove.velocity[0] = -share.SPEED_SERVER;
                }
                if(data.dir === share.UP && bodyToMove.velocity[0] === 0){
                    bodyToMove.velocity[1] = -share.SPEED_SERVER;
                }
                if(data.dir === share.DOWN && bodyToMove.velocity[0] === 0){
                    bodyToMove.velocity[1] = share.SPEED_SERVER;
                }
                data.x = bodyToMove.position[0];
                data.y = bodyToMove.position[1];
                this.state.movePlayer(client.sessionId, data);
            }
            // if player stopped:
            if(data.act === share.STOP){
                if(currentPlayer.isBusy){
                    return false;
                }
                // get player body:
                let bodyToMove = currentPlayer.p2body;
                if(bodyToMove){
                    // stop by setting speed to zero:
                    bodyToMove.velocity[0] = 0;
                    bodyToMove.velocity[1] = 0;
                    data.x = bodyToMove.position[0];
                    data.y = bodyToMove.position[1];
                    this.state.stopPlayer(client.sessionId, data);
                }
            }
            // @TODO: move chat to features.
            /*
            if(data.act === share.CHAT_ACTION){
                let message = data[share.CHAT_MESSAGE].toString().replace('\\', '');
                let messageData = {act: share.CHAT_ACTION, m: message, f: currentPlayer.username};
                this.broadcast(messageData);
                // @TODO: move chat to features.
                // this.chatHelper.saveMessage(message, currentPlayer, this.sceneId, {}, false);
            }
            if(data.act === share.CLIENT_JOINED){
                // @TODO: broadcast message of players joining rooms will be part of the configuration in the database.
                let sentText = `${currentPlayer.username} has joined ${this.roomName}.`;
                let message = `<span style="color:#0fffaa;">${sentText}.</span>`;
                this.broadcast({act: share.CHAT_ACTION, m: message, f: 'System'});
                // @TODO: move chat to features.
                // this.chatHelper.saveMessage(this.roomName, currentPlayer, this.sceneId, false, share.CHAT_JOINED);
            }
            */
            if(data.act === share.PLAYER_STATS){
                // @TODO: unset not needed data from stats?
                // delete(statsRow[0].id);
                // delete(statsRow[0].user_id);
                this.send(client, {act: share.PLAYER_STATS, stats: currentPlayer.stats});
            }
        }
    }

    createWorld(roomData)
    {
        let roomWorld = new P2world({
            sceneName: this.roomName,
            roomData: roomData,
            gravity: [0, 0],
            applyGravity: false
        });
        // assign world to room:
        this.p2world = roomWorld;
        // activate world collisions:
        this.assignCollisions();
        // @TODO: timeStep will be part of the configuration in the database.
        // start world movement:
        this.timeStep = 0.04;
        this.worldTimer = this.clock.setInterval(() => {
            this.p2world.step(this.timeStep);
        }, 1000 * this.timeStep);
        console.log('INFO - World created in Room:', this.roomName);
    }

    assignCollisions()
    {
        if(this.p2world){
            // assign actions on end contact:
            this.p2world.on('endContact', (evt) => {
                let bodyA = evt.bodyA,
                    bodyB = evt.bodyB,
                    currentPlayerBody = false,
                    wallBody = false;
                if(bodyA.playerId){
                    currentPlayerBody = bodyA;
                    wallBody = bodyB;
                    bodyA.velocity = [0, 0];
                } else {
                    if(bodyB.playerId){
                        currentPlayerBody = bodyB;
                        wallBody = bodyA;
                        bodyB.velocity = [0, 0];
                    } else {
                        // @TODO: refactor this with the NPC's implementation.
                        // @NOTE: in the current implementation we should never hit this since we do not have any other
                        // moving bodies beside the players.
                        console.log('WHO IS MOVING???', bodyA.velocity, bodyA.position, bodyB.velocity, bodyB.position);
                    }
                }
                let contactPlayer = this.getPlayerFromState(currentPlayerBody.playerId);
                if(contactPlayer.isBusy || currentPlayerBody.isChangingScene){
                    // @NOTE: if the player is been saved or if is changing scene: do nothing.
                } else {
                    let playerPosition = {x: currentPlayerBody.position[0], y: currentPlayerBody.position[1]};
                    this.state.stopPlayer(currentPlayerBody.playerId, playerPosition);
                }
                // check for scene change points:
                if(wallBody.changeScenePoint){
                    // scene change data:
                    let changeScene = wallBody.changeScenePoint;
                    let previousScene = contactPlayer.state.scene;
                    let changeData = {prev: previousScene, next: changeScene};
                    // check if the player is not changing scenes already:
                    if(currentPlayerBody.isChangingScene === false){
                        currentPlayerBody.isChangingScene = true;
                        let contactClient = this.getClientById(currentPlayerBody.playerId);
                        this.nextSceneInitialPosition(contactClient, changeData);
                        // @NOTE: we do not need to change back the isChangingScene property back to false since in the new
                        // scene a new body will be created with the value set to false by default.
                    }
                }
            });
        }
    }

    nextSceneInitialPosition(client, data)
    {
        let nextSceneProm = this.loginManager.roomsManager.loadRoomByName(data.next);
        nextSceneProm.then((nextRoom) => {
            let result = {};
            if(nextRoom){
                result = {data: data, positions: nextRoom.returnPoints};
            }
            let currentPlayer = this.state.players[client.sessionId];
            for(let newPosition of result.positions){
                // @NOTE: P === false means there's only one room that would lead to this one. If there's more than one
                // possible room then validate the previous one.
                // validate if previous room:
                if(!newPosition.P || newPosition.P === result.data.prev){
                    currentPlayer.state.scene = result.data.next;
                    currentPlayer.state.x = parseFloat(newPosition.X);
                    currentPlayer.state.y = parseFloat(newPosition.Y);
                    currentPlayer.state.dir = newPosition.D;
                    let stateSaved = this.savePlayerState(client.sessionId);
                    if(stateSaved !== false){
                        stateSaved.then((stateResult) => {
                            // @NOTE: we need to broadcast the current player scene change to be removed or added in
                            // other players.
                            this.broadcast({
                                act: share.CHANGED_SCENE,
                                id: client.sessionId,
                                scene: currentPlayer.state.scene,
                                prev: result.data.prev,
                                x: currentPlayer.state.x,
                                y: currentPlayer.state.y,
                                dir: currentPlayer.state.dir,
                            });
                            // remove body from server world:
                            let bodyToRemove = currentPlayer.p2body;
                            this.p2world.removeBody(bodyToRemove);
                            // reconnect is to create the player in the new scene:
                            this.send(client, {act: share.RECONNECT, player: currentPlayer, prev: result.data.prev});
                        }).catch((err) => {
                            console.log('ERROR - Save state error:', client.sessionId, err);
                        });
                    }
                    break;
                }
            }
        }).catch((err) => {
            console.log('ERROR - Player scene change error:', err);
        });
    }

    saveStateAndRemovePlayer(sessionId)
    {
        // save the last state on the database:
        let savePlayerProm = this.savePlayerState(sessionId);
        if(savePlayerProm) {
            savePlayerProm.then((result) => {
                // first remove player body from current world:
                let playerToRemove = this.getPlayerFromState(sessionId);
                if(playerToRemove){
                    // get body:
                    let bodyToRemove = playerToRemove.p2body;
                    if(bodyToRemove){
                        // remove body:
                        this.p2world.removeBody(bodyToRemove);
                    }
                    // remove player:
                    this.state.removePlayer(sessionId);
                }
            }).catch((err) => {
                console.log('ERROR - Player save error:', err);
            });
        }
    }

    async savePlayerState(sessionId)
    {
        // set player busy as long the state is been saved:
        let player = this.getPlayerFromState(sessionId);
        if(player.isBusy){
            return false;
        }
        player.isBusy = true;
        let room = await this.loginManager.roomsManager.loadRoomByName(player.state.scene);
        let newPlayerData = {
            room_id: room.roomId,
            x: player.state.x,
            y: player.state.y,
            dir: player.state.dir
        };
        // @TODO: temporal getting player_id from stats here.
        return this.loginManager.usersManager.updateUserStateByPlayerId(player.stats.player_id, newPlayerData);
    }

    getClientById(clientId)
    {
        let result;
        if(this.clients){
            for (let client of this.clients){
                if (client.sessionId === clientId){
                    result = client;
                    break;
                }
            }
        }
        return result;
    }

    getPlayerFromState(playerIndex)
    {
        let result = false;
        if(this.state.players[playerIndex]){
            result = this.state.players[playerIndex];
        }
        return result;
    }

}

module.exports = RoomScene;
