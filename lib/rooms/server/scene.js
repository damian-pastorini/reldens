/**
 *
 * Reldens - RoomScene
 *
 * This class will handle the scenes data and the interactions between the clients and server rooms.
 *
 */

const { RoomLogin } = require('./login');
const { State } = require('./state');
const { WorldConfig } = require('./world-config');
const { P2world } = require('../../world/server/p2world');
const { CollisionsManager } = require('../../world/server/collisions-manager');
const { ObjectsManager } = require('../../objects/server/manager');
const { RoomsConst } = require('../constants');
const { GameConst } = require('../../game/constants');
const { Logger, ErrorManager, sc } = require('@reldens/utils');

class RoomScene extends RoomLogin
{

    async onCreate(options)
    {
        this.messageActions = {};
        // parent config:
        super.onCreate(options);
        this.roomType = RoomsConst.ROOM_TYPE_SCENE;
        // override super prop:
        this.validateRoomData = true;
        Logger.info('Created RoomScene: '+this.roomName+' - ID: '+this.roomId);
        this.sceneId = this.roomId;
        // @NOTE: we create an instance of the objects manager for each room-scene, this is on purpose so all the
        // related object instances will be removed when the room is disposed.
        let objectsManagerConfig = Object.assign({events: this.events}, options);
        this.objectsManager = new ObjectsManager(objectsManagerConfig);
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
        // world data:
        this.lastCallTime = Date.now() / 1000;
        this.paused = false;
        this.customData = options.roomData.customData || {}
        WorldConfig.mapWorldConfigValues(this, this.config);
        this.allowSimultaneous = this.config.get('server/general/controls/allow_simultaneous_keys') || true;
        // create world:
        await this.createWorld(options.roomData, this.objectsManager);
        // the collisions manager has to be initialized after the world was created:
        this.collisionsManager = new CollisionsManager(this);
        // if the room has message actions those are specified here in the room-scene:
        if(options.messageActions){
            Object.assign(this.messageActions, options.messageActions);
        }
        // @NOTE: as you can see not all the scene information is being sent to the client, this is because we have
        // hidden information to be discovered (hidden objects are only active on the server side).
        this.roomData = options.roomData;
        // append public objects to the room data:
        this.roomData.preloadAssets = this.objectsManager.preloadAssets;
        // append dynamic animations data to the room data:
        this.roomData.objectsAnimationsData = this.objectsManager.objectsAnimationsData;
        Object.assign(this.roomData, {worldConfig: this.worldConfig});
        // room data is saved on the state:
        let roomState = new State(this.roomData);
        // after we set the state it will be automatically sync by the game-server:
        this.setState(roomState);
        await this.events.emit('reldens.sceneRoomOnCreate', this);
    }

    async onJoin(client, options, authResult)
    {
        await this.events.emit('reldens.joinRoomStart', this, client, options, authResult);
        if(sc.hasOwn(options, 'selectedPlayer')){
            authResult.selectedPlayer = options.selectedPlayer;
            authResult.player = this.getPlayerById(authResult.players, options.selectedPlayer);
        }
        if(this.validateRoomData){
            this.validateRoom(authResult.player.state.scene);
        }
        // check if user is already logged and disconnect from the previous client:
        let loggedUserFound = await this.disconnectLogged(options, client, authResult);
        if(!loggedUserFound){
            // player not logged, create it:
            await this.createPlayerOnScene(client, authResult);
        }
        await this.events.emit('reldens.joinRoomEnd', this, client, options, authResult);
    }

    async disconnectLogged(options, client, authResult)
    {
        if(0 === this.playersCountInState()){
            return false;
        }
        for(let i of this.playersKeysFromState()){
            let player = this.playerByIdFromState(i);
            if(player.username.toLowerCase() !== options.username.toLowerCase()){
                continue;
            }
            await this.events.emit('reldens.disconnectLoggedBefore', {room: this, player, client, options, authResult});
            await this.savePlayedTime(player);
            let savedStats = await this.savePlayerStats(player);
            let savedAndRemoved = await this.saveStateAndRemovePlayer(i);
            if (savedAndRemoved && savedStats) {
                // old player session removed, create it again:
                await this.createPlayerOnScene(client, authResult);
            }
            return true;
        }
        return false;
    }

    playerByIdFromState(id)
    {
        return this.state.players.get(id);
    }

    playersCountInState()
    {
        return this.state.players.size;
    }

    playersKeysFromState()
    {
        return Array.from(this.state.players.keys());
    }

    async createPlayerOnScene(client, authResult)
    {
        await this.events.emit('reldens.createPlayerBefore', client, authResult, this);
        // player creation:
        let currentPlayer = this.state.createPlayerSchema(authResult, client.sessionId);
        // eslint-disable-next-line no-unused-vars
        currentPlayer.persistData = async (params) => {
            // persist data in player:
            await this.events.emit('reldens.playerPersistDataBefore', client, authResult, currentPlayer, params, this);
            await this.savePlayedTime(currentPlayer);
            await this.savePlayerState(currentPlayer.sessionId);
            await this.savePlayerStats(currentPlayer, client);
            await this.events.emit('reldens.playerPersistDataAfter', client, authResult, currentPlayer, params, this);
        };
        await this.events.emit('reldens.createdPlayerSchema', client, authResult, currentPlayer, this);
        currentPlayer.playStartTime = Date.now();
        this.state.addPlayerToState(currentPlayer, client.sessionId);
        // @TODO - BETA - Create player body using a new pack in the world package.
        // create body for server physics and assign the body to the player:
        currentPlayer.physicalBody = this.roomWorld.createPlayerBody({
            id: client.sessionId,
            width: this.config.get('server/players/size/width'),
            height: this.config.get('server/players/size/height'),
            bodyState: currentPlayer.state
        });
        await this.events.emit('reldens.createPlayerAfter', client, authResult, currentPlayer, this);
        return currentPlayer;
    }

    // eslint-disable-next-line no-unused-vars
    async onLeave(client, consented)
    {
        let playerSchema = this.getPlayerFromState(client.sessionId);
        if(!playerSchema){
            Logger.error(['Player save error schema not found for session ID:', client.sessionId]);
            return;
        }
        await this.savePlayedTime(playerSchema);
        let savedStats = await this.savePlayerStats(playerSchema);
        let savedAndRemoved = await this.saveStateAndRemovePlayer(client.sessionId);
        if(!savedStats || !savedAndRemoved){
            Logger.error(['Player save error:', playerSchema.username, playerSchema.state, playerSchema.stats]);
        }
    }

    async handleReceivedMessage(client, messageData)
    {
        if(!messageData){
            Logger.error(['Empty message data:', messageData]);
            return false;
        }
        // only process the message if the player exists and has a body:
        let playerSchema = this.getPlayerFromState(client.sessionId);
        await this.executeSceneMessageActions(client, messageData, playerSchema);
        await this.executeMovePlayerActions(playerSchema, messageData);
        this.executePlayerStatsAction(messageData, client, playerSchema);
    }

    executePlayerStatsAction(messageData, client, playerSchema)
    {
        // @NOTE:
        // - Player states must be requested since are private user data that we can share with other players
        // or broadcast to the rooms.
        // - Considering base value could be changed temporally by a skill or item modifier will be really hard to
        // identify which calls and cases would require only the stat data or the statBase, so we will always send
        // both values. This could be improved in the future but for now it doesn't have a considerable impact.
        if(GameConst.PLAYER_STATS !== messageData.act){
            return false;
        }
        client.send('*', {
            act: GameConst.PLAYER_STATS,
            stats: playerSchema.stats,
            statsBase: playerSchema.statsBase
        });
    }

    async executeMovePlayerActions(playerSchema, messageData)
    {
        let bodyToMove = sc.get(playerSchema, 'physicalBody', false);
        if(!bodyToMove || GameConst.STATUS.DEATH === playerSchema.inState){
            return false;
        }
        // if player is moving:
        let bodyCanMove = !bodyToMove.isChangingScene && !bodyToMove.isBlocked;
        if(sc.hasOwn(messageData, 'dir') && bodyCanMove){
            bodyToMove.initMove(messageData.dir);
        }
        // if player stopped:
        if(GameConst.STOP === messageData.act){
            bodyToMove.stopMove();
        }
        let isPointer = GameConst.POINTER === messageData.act && this.config.get('client/players/tapMovement/enabled');
        let hasColumnAndRow = sc.hasOwn(messageData, 'column') && sc.hasOwn(messageData, 'row');
        if(isPointer && hasColumnAndRow){
            messageData = this.makeValidPoints(messageData);
            bodyToMove.moveToPoint(messageData);
        }
    }

    async executeSceneMessageActions(client, messageData, playerSchema)
    {
        let messageActionsKeys = Object.keys(this.messageActions);
        if(0 === messageActionsKeys.length){
            return;
        }
        for(let i of messageActionsKeys){
            let messageObserver = this.messageActions[i];
            if('function' !== typeof messageObserver.executeMessageActions){
                Logger.warning(['Invalid message observer!', messageObserver]);
                continue;
            }
            await messageObserver.executeMessageActions(client, messageData, this, playerSchema);
        }
    }

    // @TODO - BETA - Extract all world or bodies creation functions into a new physics driver.
    async createWorld(roomData, objectsManager)
    {
        await this.events.emit('reldens.createWorld', roomData, objectsManager, this);
        // create and assign world to room:
        this.roomWorld = this.createWorldInstance({
            sceneName: this.roomName,
            roomId: roomData.roomId,
            roomMap: roomData.roomMap,
            config: this.config,
            objectsManager: objectsManager,
            events: this.events,
            allowSimultaneous: this.allowSimultaneous,
            worldConfig: this.worldConfig
        });
        // create world limits:
        this.roomWorld.createLimits();
        // add collisions:
        await this.roomWorld.createWorldContent(roomData);
        // start world movement from the config or with the default value:
        this.worldTimer = this.clock.setInterval(() => {
            if(this.paused){
                return;
            }
            this.useFixedWorldStep ? this.roomWorld.step(this.worldConfig.timeStep) : this.stepWorldWithSubSteps();
            this.removeBodies();
        }, 1000 * this.worldConfig.timeStep);
        Logger.info('World created in Room: ' + this.roomName);
    }

    stepWorldWithSubSteps()
    {
        let now = Date.now() / 1000;
        let timeSinceLastCall = now - this.lastCallTime;
        this.roomWorld.step(this.worldConfig.timeStep, timeSinceLastCall, this.worldConfig.maxSubSteps);
    }

    removeBodies()
    {
        if(0 === this.roomWorld.removeBodies.length){
            return;
        }
        for (let removeBody of this.roomWorld.removeBodies) {
            this.roomWorld.removeBody(removeBody);
        }
        // reset the array after remove all bodies:
        this.roomWorld.removeBodies = [];
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
        let currentPlayer = this.playerByIdFromState(client.sessionId);
        for(let newPosition of nextRoom.returnPoints){
            // @NOTE: P === false means there's only one room that would lead to this one. If there's more than one
            // possible return point then validate the previous room.
            // validate if previous room:
            if(newPosition.P && newPosition.P !== data.prev){
                continue;
            }
            currentPlayer.state.scene = data.next;
            currentPlayer.state.room_id = nextRoom.roomId;
            currentPlayer.state.x = newPosition.X;
            currentPlayer.state.y = newPosition.Y;
            currentPlayer.state.dir = newPosition.D;
            let stateSaved = await this.savePlayerState(client.sessionId);
            stateSaved
                ? this.broadcastSceneChange(client, currentPlayer, data)
                : Logger.error('Save state error: ' + client.sessionId);
            break;
        }
    }

    broadcastSceneChange(client, currentPlayer, data)
    {
        // @NOTE: we need to broadcast the current player scene change to be removed or added in other players.
        this.broadcast('*', {
            act: GameConst.CHANGED_SCENE,
            id: client.sessionId,
            scene: currentPlayer.state.scene,
            prev: data.prev,
            x: currentPlayer.state.x,
            y: currentPlayer.state.y,
            dir: currentPlayer.state.dir,
            playerName: currentPlayer.playerName,
            playedTime: currentPlayer.playedTime,
            avatarKey: currentPlayer.avatarKey
        });
        // remove body from server world:
        let bodyToRemove = currentPlayer.physicalBody;
        this.roomWorld.removeBody(bodyToRemove);
        // reconnect is to create the player in the new scene:
        client.send('*', {act: GameConst.RECONNECT, player: currentPlayer, prev: data.prev});
    }

    async saveStateAndRemovePlayer(sessionId)
    {
        // save the last state on the database:
        let savedPlayer = await this.savePlayerState(sessionId);
        // first remove player body from current world:
        let playerSchema = this.getPlayerFromState(sessionId);
        let isRemoveReady = true;
        await this.events.emit('reldens.removeAllPlayerReferencesBefore', {
            room: this,
            savedPlayer,
            playerSchema,
            isRemoveReady
        });
        playerSchema && isRemoveReady
            ? this.removeAllPlayerReferences(playerSchema, sessionId)
            : ErrorManager.error('Player not found, session ID: ' + sessionId);
        return savedPlayer;
    }

    removeAllPlayerReferences(playerSchema, sessionId)
    {
        // get body:
        let bodyToRemove = playerSchema.physicalBody;
        if (bodyToRemove) {
            // remove body:
            this.roomWorld.removeBody(bodyToRemove);
        }
        // remove the events:
        this.events.offByMasterKey(playerSchema.eventsPrefix + playerSchema.player_id);
        // remove player:
        this.state.removePlayer(sessionId);
    }

    async savePlayerState(sessionId)
    {
        let playerSchema = this.getPlayerFromState(sessionId);
        let {room_id, x, y, dir} = playerSchema.state;
        let playerId = playerSchema.player_id;
        let updatePatch = {room_id, x: parseInt(x), y: parseInt(y), dir};
        let updateReady = true;
        this.events.emitSync('reldens.onSavePlayerStateBefore', {
            room: this,
            playerSchema,
            playerId,
            updatePatch,
            updateReady
        });
        if(!updateReady){
            return playerSchema;
        }
        let updateResult = await this.loginManager.usersManager.updateUserStateByPlayerId(playerId, updatePatch);
        if(!updateResult){
            Logger.error('Player update error: ' + playerId);
        }
        return playerSchema;
    }

    async savePlayerStats(target, updateClient)
    {
        // @TODO - BETA - For now we are always updating all the stats but this can be improved to save only the ones
        //   that changed.
        // save the stats:
        let updateReady = true;
        this.events.emitSync('reldens.onSavePlayerStatsBefore', {room: this, target, updateClient, updateReady});
        if(!updateReady){
            return false;
        }
        for(let i of Object.keys(target.stats)){
            let statId = this.config.client.players.initialStats[i].id;
            // we can use a single update query so we can easily update both value and base_value:
            let statPatch = {
                value: target.stats[i],
                base_value: target.statsBase[i]
            };
            await this.loginManager.usersManager.updatePlayerStatByIds(target.player_id, statId, statPatch);
        }
        if(updateClient){
            // @TODO - BETA - Convert all events in constants and consolidate them in a single file with descriptions.
            await this.events.emit('reldens.savePlayerStatsUpdateClient', updateClient, target, this);
            updateClient.send('*', {act: GameConst.PLAYER_STATS, stats: target.stats, statsBase: target.statsBase});
        }
        return true;
    }

    async savePlayedTime(playerSchema)
    {
        let currentlyPlayedTime = (Date.now() - playerSchema.playStartTime) / 1000;
        let playedTime = Number(playerSchema.playedTime)+Number(currentlyPlayedTime.toFixed());
        playerSchema.playedTime = playedTime;
        let updateResult = await this.loginManager.usersManager.dataServer.getEntity('users').updateById(
            playerSchema.id,
            {played_time: playedTime}
        );
        if(!updateResult){
            Logger.error(['User time update error:', playerSchema.player_id]);
        }
        return playerSchema;
    }

    getClientById(clientId)
    {
        if(!this.clients){
            return false;
        }
        for(let client of this.clients){
            if(client.sessionId === clientId){
                return client;
            }
        }
        return false;
    }

    getPlayerFromState(playerIndex)
    {
        return this.state.players.get(playerIndex);// sc.get(this.state.players, playerIndex, false);
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
        // @TODO - BETA - Replace this by a master key related to the room ID and just remove all the events related
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
                    if(!sc.hasOwn(obj, 'battleEndListener')){
                        continue;
                    }
                    this.events.offWithKey(obj.key+'battleEnd', 'battleRoom');
                }
            }
        }
    }

}

module.exports.RoomScene = RoomScene;
