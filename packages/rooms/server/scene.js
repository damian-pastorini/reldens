/**
 *
 * Reldens - RoomScene
 *
 * This class will handle the scenes data and the interactions between the clients and server rooms.
 *
 */

const { RoomLogin } = require('./login');
const { State } = require('./state');
const { P2world } = require('../../world/server/p2world');
const { CollisionsManager } = require('../../world/server/collisions-manager');
const { ObjectsManager } = require('../../objects/server/manager');
const { GameConst } = require('../../game/constants');
const { Logger } = require('../../game/logger');
const { ErrorManager } = require('../../game/error-manager');

class RoomScene extends RoomLogin
{

    messageActions = {};

    async onCreate(options)
    {
        // parent config:
        super.onCreate(options);
        // override super prop:
        this.validateRoomData = true;
        Logger.info('INIT ROOM: '+ this.roomName);
        // this.roomId = options.room.roomId;
        this.sceneId = this.roomId;
        // @NOTE: we create an instance of the objects manager for each room-scene, this is on purpose so all the
        // related object instances will be removed when the room is disposed.
        this.objectsManager = new ObjectsManager(options);
        // load the objects from the storage:
        await this.objectsManager.loadObjectsByRoomId(options.roomData.roomId);
        if(this.objectsManager.listenMessages){
            Object.assign(this.messageActions, this.objectsManager.listenMessagesObjects);
        }
        // create world:
        this.createWorld(options.roomData, this.objectsManager);
        // the collisions manager has to be initialized after the world was created:
        this.collisionsManager = new CollisionsManager(this);
        // if the room has message actions those are specified here in the room-scene:
        if(options.messageActions){
            Object.assign(this.messageActions, options.messageActions);
        }
        // append public objects to the room data:
        options.roomData.preloadAssets = this.objectsManager.preloadAssets;
        // append dynamic animations data to the room data:
        options.roomData.objectsAnimationsData = this.objectsManager.objectsAnimationsData;
        // @NOTE: as you can see not all the scene information is been sent to the client, this is because we have
        // hidden information to be discovered (hidden objects are only active on the server side).
        this.roomData = options.roomData;
        // room data is saved on the state:
        let roomState = new State(options.roomData);
        // after we set the state it will be automatically sync by the game-server:
        this.setState(roomState);
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
            width: this.config.get('server/players/size/width'),
            height: this.config.get('server/players/size/height'),
            x: currentPlayer.state.x,
            y: currentPlayer.state.y,
        });
    }

    // eslint-disable-next-line no-unused-vars
    async onLeave(client, consented)
    {
        let playerSchema = this.getPlayerFromState(client.sessionId);
        if(playerSchema){
            this.saveStateAndRemovePlayer(client.sessionId).catch((err) => {
                Logger.error(['Player save error:', playerSchema.username, playerSchema.state, err]);
            });
        }
    }

    onMessage(client, messageData)
    {
        // get player:
        let playerSchema = this.getPlayerFromState(client.sessionId);
        if(playerSchema && {}.hasOwnProperty.call(playerSchema, 'p2body')){
            // get player body:
            let bodyToMove = playerSchema.p2body;
            // if player is moving:
            if({}.hasOwnProperty.call(messageData, 'dir') && bodyToMove){
                if(this.config.get('server/general/controls/allow_simultaneous_keys') === 1){
                    /* @TODO: implement simultaneous directions movement.
                    if(messageData.dir === GameConst.RIGHT){
                        bodyToMove.velocity[0] = GameConst.SPEED_SERVER;
                    }
                    if(messageData.dir === GameConst.LEFT){
                        bodyToMove.velocity[0] = -GameConst.SPEED_SERVER;
                    }
                    if(messageData.dir === GameConst.UP){
                        bodyToMove.velocity[1] = -GameConst.SPEED_SERVER;
                    }
                    if(messageData.dir === GameConst.DOWN){
                        bodyToMove.velocity[1] = GameConst.SPEED_SERVER;
                    }
                    */
                } else {
                    let serverSpeed = this.config.get('server/players/physicsBody/speed') || GameConst.SPEED_SERVER;
                    // if body is moving then avoid multiple key press at the same time:
                    if(messageData.dir === GameConst.RIGHT && bodyToMove.velocity[1] === 0){
                        bodyToMove.velocity[0] = serverSpeed;
                    }
                    if(messageData.dir === GameConst.LEFT && bodyToMove.velocity[1] === 0){
                        bodyToMove.velocity[0] = -serverSpeed;
                    }
                    if(messageData.dir === GameConst.UP && bodyToMove.velocity[0] === 0){
                        bodyToMove.velocity[1] = -serverSpeed;
                    }
                    if(messageData.dir === GameConst.DOWN && bodyToMove.velocity[0] === 0){
                        bodyToMove.velocity[1] = serverSpeed;
                    }
                }
                messageData.x = bodyToMove.position[0];
                messageData.y = bodyToMove.position[1];
                this.state.movePlayer(client.sessionId, messageData);
            }
            // if player stopped:
            if(messageData.act === GameConst.STOP){
                // get player body:
                let bodyToMove = playerSchema.p2body;
                if(bodyToMove){
                    // stop by setting speed to zero:
                    bodyToMove.velocity[0] = 0;
                    bodyToMove.velocity[1] = 0;
                    messageData.x = bodyToMove.position[0];
                    messageData.y = bodyToMove.position[1];
                    this.state.stopPlayer(client.sessionId, messageData);
                }
            }
            if(messageData.act === GameConst.ACTION){
                Logger.info('Player Action!');
            }
            if(this.messageActions){
                for(let idx in this.messageActions){
                    let messageObserver = this.messageActions[idx];
                    if(typeof messageObserver.parseMessageAndRunActions === 'function'){
                        messageObserver.parseMessageAndRunActions(client, messageData, this, playerSchema);
                    } else {
                        Logger.error(['Broken message observer!', messageObserver]);
                    }
                }
            }
            // @NOTE: player states must be requested since are private user data that we can share with other players
            // or broadcast to the rooms.
            if(messageData.act === GameConst.PLAYER_STATS){
                this.send(client, {act: GameConst.PLAYER_STATS, stats: playerSchema.stats});
            }
        }
    }

    createWorld(roomData, objectsManager)
    {
        // create and assign world to room:
        this.roomWorld = this.getWorldInstance({
            sceneName: this.roomName,
            roomData: roomData,
            gravity: [0, 0],
            applyGravity: false,
            objectsManager: objectsManager
        });
        // start world movement from the config or with the default value:
        this.timeStep = this.config.get('server/rooms/world/timestep') || 0.04;
        this.worldTimer = this.clock.setInterval(() => {
            this.roomWorld.step(this.timeStep);
        }, 1000 * this.timeStep);
        Logger.info('World created in Room: ' + this.roomName);
    }

    getWorldInstance(data)
    {
        return new P2world(data);
    }

    async nextSceneInitialPosition(client, data)
    {
        let nextRoom = await this.loginManager.roomsManager.loadRoomByName(data.next);
        if(!nextRoom){
            ErrorManager.error('Player room change error. Next room not found: ' + data.next);
        }
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
                        act: GameConst.CHANGED_SCENE,
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
                    this.send(client, {act: GameConst.RECONNECT, player: currentPlayer, prev: data.prev});
                } else {
                    Logger.error('Save state error: ' + client.sessionId);
                }
                break;
            }
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
            ErrorManager.error('Player not found, session ID: ' + sessionId);
        }
        return savedPlayer;
    }

    async savePlayerState(sessionId)
    {
        // @TODO: since for now we only have one player by user, playerSchema is actually the currentUser.
        let playerSchema = this.getPlayerFromState(sessionId);
        let {room_id, x, y, dir} = playerSchema.state;
        let playerId = playerSchema.player_id;
        let updateResult = await this.loginManager.usersManager
            .updateUserStateByPlayerId(playerId, {room_id, x, y, dir});
        if(updateResult){
            return playerSchema;
        } else {
            Logger.error('Player update error: ' + playerId);
        }
    }

    getClientById(clientId)
    {
        let result = false;
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

module.exports.RoomScene = RoomScene;
