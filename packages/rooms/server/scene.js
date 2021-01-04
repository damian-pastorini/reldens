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
const { Logger, ErrorManager, sc } = require('@reldens/utils');
const { EventsManagerSingleton } = require('@reldens/utils');

class RoomScene extends RoomLogin
{

    async onCreate(options)
    {
        this.messageActions = {};
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
        // generate object instances:
        if(this.objectsManager.roomObjectsData){
            await this.objectsManager.generateObjects();
        }
        // append objects that will listen messages:
        if(this.objectsManager.listenMessages){
            Object.assign(this.messageActions, this.objectsManager.listenMessagesObjects);
        }
        // world objects normal speed:
        this.worldSpeed = this.config.get('server/players/physicsBody/speed') || GameConst.SPEED_SERVER;
        // keys events:
        this.allowSimultaneous = this.config.get('server/general/controls/allow_simultaneous_keys');
        // create world:
        await this.createWorld(options.roomData, this.objectsManager);
        // the collisions manager has to be initialized after the world was created:
        this.collisionsManager = new CollisionsManager(this);
        // if the room has message actions those are specified here in the room-scene:
        if(options.messageActions){
            Object.assign(this.messageActions, options.messageActions);
        }
        // @NOTE: as you can see not all the scene information is been sent to the client, this is because we have
        // hidden information to be discovered (hidden objects are only active on the server side).
        this.roomData = options.roomData;
        // append public objects to the room data:
        this.roomData.preloadAssets = this.objectsManager.preloadAssets;
        // append dynamic animations data to the room data:
        this.roomData.objectsAnimationsData = this.objectsManager.objectsAnimationsData;
        // room data is saved on the state:
        let roomState = new State(this.roomData);
        // after we set the state it will be automatically sync by the game-server:
        this.setState(roomState);
        await EventsManagerSingleton.emit('reldens.sceneRoomOnCreate', this);
    }

    async onJoin(client, options, authResult)
    {
        // check if user is already logged and disconnect from the previous client:
        let loggedUserFound = false;
        if(this.state.players){
            for(let i of Object.keys(this.state.players)){
                let player = this.state.players[i];
                if(player.username.toLowerCase() === options.username.toLowerCase()){
                    loggedUserFound = true;
                    let savedStats = await this.savePlayerStats(player);
                    let savedAndRemoved = await this.saveStateAndRemovePlayer(i);
                    if(savedAndRemoved && savedStats){
                        // old player session removed, create it again:
                        await this.createPlayer(client, authResult);
                    }
                    break;
                }
            }
        }
        if(!loggedUserFound){
            // player not logged, create it:
            await this.createPlayer(client, authResult);
        }
    }

    async createPlayer(client, authResult)
    {
        await EventsManagerSingleton.emit('reldens.createPlayerBefore', client, authResult, this);
        // player creation:
        let currentPlayer = this.state.createPlayer(client.sessionId, authResult);
        // @TODO - BETA.17 - Create player body using a new pack in the world package.
        // create body for server physics and assign the body to the player:
        currentPlayer.physicalBody = this.roomWorld.createPlayerBody({
            id: client.sessionId,
            width: this.config.get('server/players/size/width'),
            height: this.config.get('server/players/size/height'),
            bodyState: currentPlayer.state
        });
        await EventsManagerSingleton.emit('reldens.createPlayerAfter', client, authResult, currentPlayer, this);
    }

    // eslint-disable-next-line no-unused-vars
    async onLeave(client, consented)
    {
        let playerSchema = this.getPlayerFromState(client.sessionId);
        if(playerSchema){
            let savedStats = await this.savePlayerStats(playerSchema);
            let savedAndRemoved = await this.saveStateAndRemovePlayer(client.sessionId);
            if(!savedStats || !savedAndRemoved){
                Logger.error(['Player save error:', playerSchema.username, playerSchema.state, playerSchema.stats]);
            }
        }
    }

    onMessage(client, messageData)
    {
        if(!messageData){
            Logger.error(['Empty message data:', messageData]);
            return false;
        }
        // get player:
        let playerSchema = this.getPlayerFromState(client.sessionId);
        // @TODO - BETA.17 - Move to a new pack in the world package.
        // only process the message if the player exists and has a body:
        if(playerSchema && sc.hasOwn(playerSchema, 'physicalBody')){
            // get player body:
            let bodyToMove = playerSchema.physicalBody;
            // if player is moving:
            if(
                sc.hasOwn(messageData, 'dir') 
                && bodyToMove
                && !bodyToMove.isChangingScene
                && !bodyToMove.isBlocked
            ){
                bodyToMove.initMove(messageData.dir);
            }
            // if player stopped:
            if(messageData.act === GameConst.STOP && bodyToMove){
                // stop by setting speed to zero:
                bodyToMove.stopMove();
            }
            if(
                messageData.act === GameConst.POINTER
                && sc.hasOwn(messageData, 'column')
                && sc.hasOwn(messageData, 'row')
                && bodyToMove
                && !bodyToMove.isChangingScene
                && !bodyToMove.isBlocked
            ){
                messageData = this.makeValidPoints(messageData);
                bodyToMove.moveToPoint(messageData);
            }
            if(this.messageActions){
                for(let i of Object.keys(this.messageActions)){
                    let messageObserver = this.messageActions[i];
                    if(typeof messageObserver.parseMessageAndRunActions === 'function'){
                        messageObserver.parseMessageAndRunActions(client, messageData, this, playerSchema);
                    } else {
                        Logger.error(['Invalid message observer!', messageObserver]);
                    }
                }
            }
            // @NOTE:
            // - Player states must be requested since are private user data that we can share with other players
            // or broadcast to the rooms.
            // - Considering base value could be changed temporally by a skill or item modifier will be really hard to
            // identify which calls and cases would require only the stat data or the statBase so we will always send
            // both values. This could be improved in the future but for now it doesn't have a considerable impact.
            if(messageData.act === GameConst.PLAYER_STATS){
                this.send(client, {
                    act: GameConst.PLAYER_STATS,
                    stats: playerSchema.stats,
                    statsBase: playerSchema.statsBase
                });
            }
        }
    }

    async createWorld(roomData, objectsManager)
    {
        await EventsManagerSingleton.emit('reldens.createWorld', roomData, objectsManager, this);
        // create and assign world to room:
        this.roomWorld = this.createWorldInstance({
            sceneName: this.roomName,
            roomData: roomData,
            gravity: [0, 0],
            applyGravity: false,
            objectsManager: objectsManager,
            tryClosestPath: this.config.get('server/rooms/world/tryClosestPath'),
            onlyWalkable: this.config.get('server/rooms/world/onlyWalkable'),
            worldSpeed: this.worldSpeed,
            allowSimultaneous: this.allowSimultaneous
        });
        // create world limits:
        this.roomWorld.createLimits();
        // add collisions:
        await this.roomWorld.createWorldContent(roomData);
        // start world movement from the config or with the default value:
        this.timeStep = this.config.get('server/rooms/world/timestep') || 0.04;
        this.worldTimer = this.clock.setInterval(() => {
            this.roomWorld.step(this.timeStep);
            if(this.roomWorld.removeBodies.length){
                for(let removeBody of this.roomWorld.removeBodies){
                    this.roomWorld.removeBody(removeBody);
                }
                // reset the array after remove all bodies:
                this.roomWorld.removeBodies = [];
            }
        }, 1000 * this.timeStep);
        Logger.info('World created in Room: ' + this.roomName);
    }

    createWorldInstance(data)
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
                        username: currentPlayer.username
                    });
                    // remove body from server world:
                    let bodyToRemove = currentPlayer.physicalBody;
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
            let bodyToRemove = playerSchema.physicalBody;
            if(bodyToRemove){
                // remove body:
                this.roomWorld.removeBody(bodyToRemove);
            }
            // remove the events:
            EventsManagerSingleton.offByMasterKey(playerSchema.eventsPrefix+playerSchema.player_id);
            // remove player:
            this.state.removePlayer(sessionId);
        } else {
            ErrorManager.error('Player not found, session ID: ' + sessionId);
        }
        return savedPlayer;
    }

    async savePlayerState(sessionId)
    {
        let playerSchema = this.getPlayerFromState(sessionId);
        let {room_id, x, y, dir} = playerSchema.state;
        let playerId = playerSchema.player_id;
        let updateResult = await this.loginManager.usersManager
            .updateUserStateByPlayerId(playerId, {room_id, x: parseInt(x), y: parseInt(y), dir});
        if(updateResult){
            return playerSchema;
        } else {
            Logger.error('Player update error: ' + playerId);
        }
    }

    async savePlayerStats(target, updateClient)
    {
        // @TODO - BETA.17: for now we are always updating all the stats but this can be improved to save only the
        //   ones that changed.
        // save the stats:
        for(let i of Object.keys(target.stats)){
            let statId = this.config.server.players.initialStats[i].id;
            // we can use a single update query so we can easily update both value and base_value:
            let statPatch = {
                value: target.stats[i],
                base_value: target.statsBase[i]
            };
            await this.loginManager.usersManager.updatePlayerStatByIds(target.player_id, statId, statPatch);
        }
        if(updateClient){
            this.send(updateClient, {
                act: GameConst.PLAYER_STATS,
                stats: target.stats,
                statsBase: target.statsBase
            });
        }
        return true;
    }

    getClientById(clientId)
    {
        let result = false;
        if(this.clients){
            for(let client of this.clients){
                if(client.sessionId === clientId){
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

    makeValidPoints(points)
    {
        points.column = points.column < 0 ? 0 : points.column;
        points.column = points.column > this.roomWorld.worldWidth ? this.roomWorld.worldWidth : points.column;
        points.row = points.row < 0 ? 0 : points.row;
        points.row = points.row > this.roomWorld.worldHeight ? this.roomWorld.worldHeight : points.row;
        return points;
    }

    onDispose()
    {
        Logger.info('ON-DISPOSE Room: ' + this.roomName);
        // @TODO - BETA.17 - Replace this by a master key related to the room ID and just remove all the events related
        //   to this room.
        if(!this.roomWorld.respawnAreas){
            return true;
        }
        // clean up the listeners!
        for(let rI of Object.keys(this.roomWorld.respawnAreas)){
            let instC = this.roomWorld.respawnAreas[rI].instancesCreated;
            for(let i of Object.keys(instC)){
                let res = instC[i];
                for(let obj of res){
                    if(sc.hasOwn(obj, 'battleEndListener')){
                        EventsManagerSingleton.offWithKey(obj.uid+'battleEnd', 'battleRoom');
                    }
                }
            }
        }
    }

}

module.exports.RoomScene = RoomScene;
