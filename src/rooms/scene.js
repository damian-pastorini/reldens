/**
 *
 * Reldens - RoomScene
 *
 * This class will handle the scenes data and the interactions between the clients and server rooms.
 *
 */

const RoomLogin = require('./login');
const State = require('./state');
const P2world = require('../world/p2world');
const CollisionsManager = require('../world/collisions-manager');
const share = require('../utils/constants');
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
        let roomState = new State(options.roomData);
        this.setState(roomState);
        // create world:
        this.createWorld(options.roomData);
        // note the collisions manager has to be initialized after the world was created:
        this.collisionsManager = new CollisionsManager(this);
    }

    async onJoin(client, options, authResult)
    {
        // check if user is already logged and disconnect from the previous client:
        let loggedUserFound = false;
        if(this.state.players){
            for(let playerIdx in this.state.players){
                let player = this.state.players[playerIdx];
                if(player.username === options.username){
                    loggedUserFound = true;
                    let savedAndRemoved = await this.saveStateAndRemovePlayer(playerIdx);
                    if(savedAndRemoved){
                        // old player session removed, create it again:
                        this.createPlayer(client, authResult);
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
        currentPlayer.p2body = this.roomWorld.createPlayerBody({
            id: client.sessionId,
            width: this.config.server.players.size.width,
            height: this.config.server.players.size.height,
            x: currentPlayer.state.x,
            y: currentPlayer.state.y,
        });
    }

    async onLeave(client, consented)
    {
        let playerSchema = this.getPlayerFromState(client.sessionId);
        if(playerSchema){
            this.saveStateAndRemovePlayer(client.sessionId).catch((err) => {
                console.log('ERROR - Player save error:', playerSchema.username, playerSchema.state, err);
            });
        }
    }

    onMessage(client, data)
    {
        // get player:
        let playerSchema = this.getPlayerFromState(client.sessionId);
        if(playerSchema && playerSchema.hasOwnProperty('p2body')){
            // get player body:
            let bodyToMove = playerSchema.p2body;
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
                // @TODO: remove isBusy.
                if(playerSchema.isBusy){
                    console.log('player is busy to stop?');
                    return false;
                }
                // get player body:
                let bodyToMove = playerSchema.p2body;
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
                let messageData = {act: share.CHAT_ACTION, m: message, f: playerSchema.username};
                this.broadcast(messageData);
                // @TODO: move chat to features.
                // this.chatHelper.saveMessage(message, playerSchema, this.sceneId, {}, false);
            }
            if(data.act === share.CLIENT_JOINED){
                // @TODO: broadcast message of players joining rooms will be part of the configuration in the database.
                let sentText = `${playerSchema.username} has joined ${this.roomName}.`;
                let message = `<span style="color:#0fffaa;">${sentText}.</span>`;
                this.broadcast({act: share.CHAT_ACTION, m: message, f: 'System'});
                // @TODO: move chat to features.
                // this.chatHelper.saveMessage(this.roomName, playerSchema, this.sceneId, false, share.CHAT_JOINED);
            }
            */
            // @NOTE: player states must be requested since are private user data that we can share with other players
            // or broadcast to the rooms.
            if(data.act === share.PLAYER_STATS){
                // @TODO: unset not needed data from stats?
                // delete(statsRow[0].id);
                // delete(statsRow[0].user_id);
                this.send(client, {act: share.PLAYER_STATS, stats: playerSchema.stats});
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
        this.roomWorld = roomWorld;
        // @TODO: timeStep will be part of the configuration in the database.
        // start world movement:
        this.timeStep = 0.04;
        this.worldTimer = this.clock.setInterval(() => {
            this.roomWorld.step(this.timeStep);
        }, 1000 * this.timeStep);
        console.log('INFO - World created in Room:', this.roomName);
    }

    async nextSceneInitialPosition(client, data)
    {
        let nextRoom = await this.loginManager.roomsManager.loadRoomByName(data.next);
        if(nextRoom){
            let currentPlayer = this.state.players[client.sessionId];
            for(let newPosition of nextRoom.returnPoints){
                // @NOTE: P === false means there's only one room that would lead to this one. If there's more than one
                // possible return point then validate the previous room.
                // validate if previous room:
                if(!newPosition.P || newPosition.P === data.prev){
                    currentPlayer.state.scene = data.next;
                    currentPlayer.state.room_id = nextRoom.roomId;
                    currentPlayer.state.x = newPosition.X;
                    currentPlayer.state.y = newPosition.Y;
                    currentPlayer.state.dir = newPosition.D;
                    let stateSaved = await this.savePlayerState(client.sessionId);
                    if(stateSaved){
                        // @NOTE: we need to broadcast the current player scene change to be removed or added in
                        // other players.
                        this.broadcast({
                            act: share.CHANGED_SCENE,
                            id: client.sessionId,
                            scene: currentPlayer.state.scene,
                            prev: data.prev,
                            x: currentPlayer.state.x,
                            y: currentPlayer.state.y,
                            dir: currentPlayer.state.dir,
                        });
                        // remove body from server world:
                        let bodyToRemove = currentPlayer.p2body;
                        this.roomWorld.removeBody(bodyToRemove);
                        // reconnect is to create the player in the new scene:
                        this.send(client, {act: share.RECONNECT, player: currentPlayer, prev: data.prev});
                    } else {
                        console.log('ERROR - Save state error:', client.sessionId, err);
                    }
                    break;
                }
            }
        } else {
            console.log('ERROR - Player room change error. Next room not found:', data.next);
        }
    }

    async saveStateAndRemovePlayer(sessionId)
    {
        // save the last state on the database:
        let savedPlayer = await this.savePlayerState(sessionId);
        // first remove player body from current world:
        let playerSchema = this.getPlayerFromState(sessionId);
        if(playerSchema){
            // get body:
            let bodyToRemove = playerSchema.p2body;
            if(bodyToRemove){
                // remove body:
                this.roomWorld.removeBody(bodyToRemove);
            }
            // remove player:
            this.state.removePlayer(sessionId);
        } else {
            console.log('ERROR - Player not found:', sessionId);
        }
        return savedPlayer;
    }

    async savePlayerState(sessionId)
    {
        // set player busy as long the state is been saved:
        let playerSchema = this.getPlayerFromState(sessionId);
        // @TODO: remove isBusy.
        if(playerSchema.isBusy){
            console.log('player.isBusy to be saved?', playerSchema.isBusy);
            return false;
        }
        playerSchema.isBusy = 'saving player';
        let newPlayerData = {
            room_id: playerSchema.state.room_id,
            x: playerSchema.state.x,
            y: playerSchema.state.y,
            dir: playerSchema.state.dir
        };
        // @TODO: temporal getting player_id from stats here.
        let playerId = playerSchema.stats.player_id;
        let updateResult = await this.loginManager.usersManager.updateUserStateByPlayerId(playerId, newPlayerData);
        playerSchema.isBusy = false;
        if(updateResult){
            return playerSchema;
        } else {
            throw new Error('ERROR - Player update error.');
        }
    }

    getClientById(clientId)
    {
        let result;
        if(this.clients){
            for(let client of this.clients){
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
