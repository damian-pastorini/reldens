/**
 *
 * Reldens - RoomScene
 *
 */

const { RoomLogin } = require('./login');
const { State } = require('./state');
const { WorldConfig } = require('./world-config');
const { P2world } = require('../../world/server/p2world');
const { CollisionsManager } = require('../../world/server/collisions-manager');
const { WorldPointsValidator } = require('../../world/world-points-validator');
const { WorldTimer } = require('../../world/world-timer');
const { ObjectsManager } = require('../../objects/server/manager');
const { RoomsConst } = require('../constants');
const { GameConst } = require('../../game/constants');
const { Logger, ErrorManager, sc } = require('@reldens/utils');

class RoomScene extends RoomLogin
{

    async onCreate(options)
    {
        this.activePlayers = {};
        this.messageActions = {};
        this.movementInterval = {};
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
        await this.objectsManager.loadObjectsByRoomId(options.roomData.roomId);
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
        this.customData = options.roomData.customData || {};
        WorldConfig.mapWorldConfigValues(this, this.config);
        this.allowSimultaneous = this.config.get('client/general/controls/allowSimultaneousKeys', true);
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
        Object.assign(this.worldConfig, this.roomData.customData);
        Object.assign(this.roomData, {worldConfig: this.worldConfig});
        // room data is saved on the state:
        let roomState = new State(this.roomData);
        // after we set the state it will be automatically sync by the game-server:
        this.setState(roomState);
        await this.events.emit('reldens.sceneRoomOnCreate', this);
    }

    async onJoin(client, options, userModel)
    {
        await this.events.emit('reldens.joinRoomStart', this, client, options, userModel);
        if(sc.hasOwn(options, 'selectedPlayer')){
            userModel.selectedPlayer = options.selectedPlayer;
            userModel.player = this.getPlayerById(userModel.players, options.selectedPlayer);
        }
        if(this.validateRoomData){
            this.validateRoom(userModel.player.state.scene);
        }
        // check if user is already logged and disconnect from the previous client:
        let loggedPlayer = await this.disconnectLogged(options, client, userModel);
        if(!loggedPlayer){
            // player not logged, create it:
            loggedPlayer = await this.createPlayerOnScene(client, userModel);
        }
        // we do not need to create a player entity since we only need the name for the chat:
        this.activePlayers[client.sessionId] = {
            userId: userModel.id,
            sessionId: client.sessionId,
            playerName: userModel.player.name,
            role_id: userModel.role_id,
            playerData: userModel.player,
            client: client
        };
        await this.events.emit('reldens.joinRoomEnd', this, client, options, userModel, loggedPlayer);
    }

    async disconnectLogged(options, client, userModel)
    {
        if(0 === this.playersCountInState()){
            return false;
        }
        for(let i of this.playersKeysFromState()){
            let player = this.playerBySessionIdFromState(i);
            if(player.username.toLowerCase() !== options.username.toLowerCase()){
                continue;
            }
            await this.events.emit('reldens.disconnectLoggedBefore', {room: this, player, client, options, userModel});
            await this.savePlayedTime(player);
            let savedStats = await this.savePlayerStats(player);
            let savedState = await this.savePlayerState(i);
            if(savedState && savedStats){
                let removed = await this.removePlayer(i);
                if(removed){
                    // old player session removed, create it again with the updated data:
                    return await this.createPlayerOnScene(client, userModel, player);
                }
            }
        }
        return false;
    }

    playerBySessionIdFromState(sessionId)
    {
        // @TODO - BETA - Refactor and extract Colyseus into a driver.
        return this.state.players.get(sessionId);
    }

    playerByPlayerIdFromState(playerId)
    {
        if(0 === this.playersCountInState()){
            return false;
        }
        for(let i of this.playersKeysFromState()){
            let tmp = this.playerBySessionIdFromState(i);
            if(tmp.player_id === playerId){
                return tmp;
            }
        }
        return false;
    }

    playersCountInState()
    {
        // @TODO - BETA - Refactor and extract Colyseus into a driver.
        return this.state.players.size;
    }

    playersKeysFromState()
    {
        // @TODO - BETA - Refactor and extract Colyseus into a driver.
        return Array.from(this.state.players.keys());
    }

    async createPlayerOnScene(client, userModel, updatedPlayer)
    {
        await this.events.emit('reldens.createPlayerBefore', client, userModel, this);
        let currentPlayer = this.state.createPlayerSchema(userModel, client.sessionId);
        if(updatedPlayer){
            currentPlayer.syncPlayer(updatedPlayer);
        }
        currentPlayer.persistData = async (params) => {
            await this.events.emit('reldens.playerPersistDataBefore', client, userModel, currentPlayer, params, this);
            await this.savePlayedTime(currentPlayer);
            await this.savePlayerState(currentPlayer.sessionId);
            await this.savePlayerStats(currentPlayer, client);
            await this.events.emit('reldens.playerPersistDataAfter', client, userModel, currentPlayer, params, this);
        };
        await this.events.emit('reldens.createdPlayerSchema', client, userModel, currentPlayer, this);
        currentPlayer.playStartTime = Date.now();
        this.state.addPlayerToState(currentPlayer, client.sessionId);
        // @TODO - BETA - Create player body using a new pack in the world package.
        currentPlayer.physicalBody = this.roomWorld.createPlayerBody({
            id: client.sessionId,
            width: this.config.get('client/players/physicalBody/width'),
            height: this.config.get('client/players/physicalBody/height'),
            bodyState: currentPlayer.state
        });
        await this.events.emit('reldens.createPlayerAfter', client, userModel, currentPlayer, this);
        return currentPlayer;
    }

    async onLeave(client, consented)
    {
        let playerSchema = this.playerBySessionIdFromState(client.sessionId);
        if(!playerSchema){
            // expected when player is automatically disconnected on second login:
            Logger.info('Player save error schema not found for session ID: '+client.sessionId, client.auth);
            return;
        }
        await this.savePlayedTime(playerSchema);
        let savedStats = await this.savePlayerStats(playerSchema);
        if(!savedStats){
            Logger.error('Player save stats error.', playerSchema);
        }
        let savedState = await this.savePlayerState(client.sessionId);
        if(!savedState){
            Logger.error('Player save state error.', playerSchema);
        }
        let removed = await this.removePlayer(client.sessionId);
        if(!removed){
            Logger.error('Player remove error.', playerSchema);
        }
        delete this.activePlayers[client.sessionId];
    }

    async handleReceivedMessage(client, messageData)
    {
        if(!messageData){
            Logger.error(['Empty message data:', messageData]);
            return false;
        }
        // only process the message if the player exists and has a body:
        let playerSchema = this.playerBySessionIdFromState(client.sessionId);
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
        if(!bodyToMove){
            Logger.warning('Player ID "'+playerSchema.player_id+'" body not found.');
            return false;
        }
        if(GameConst.STATUS.DEATH === playerSchema.inState){
            return false;
        }
        if(GameConst.STOP === messageData.act){
            this.clearMovementIntervals();
            bodyToMove.stopMove();
        }
        let bodyCanMove = !bodyToMove.isChangingScene && !bodyToMove.isBlocked;
        if(!bodyCanMove){
            return false;
        }
        if(sc.hasOwn(messageData, 'dir') && bodyCanMove){
            // @TODO - BETA - Create a single class/point for setIntervals or timeOuts instances creation.
            this.movementInterval[messageData.dir] = setInterval(
                () => {
                    bodyToMove.initMove(messageData.dir);
                },
                bodyToMove.world.timeStep
            );
            return true;
        }
        let isPointer = GameConst.POINTER === messageData.act && this.config.get('client/players/tapMovement/enabled');
        let hasColumnAndRow = sc.hasOwn(messageData, 'column') && sc.hasOwn(messageData, 'row');
        if(isPointer && hasColumnAndRow){
            this.clearMovementIntervals();
            bodyToMove.stopMove();
            messageData = this.pointsValidator.makeValidPoints(messageData);
            bodyToMove.moveToPoint(messageData);
        }
    }

    clearMovementIntervals()
    {
        let intervalKeys = Object.keys(this.movementInterval);
        for(let i of intervalKeys){
            clearInterval(this.movementInterval[i]);
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
                Logger.warning('Invalid message observer.', messageObserver);
                continue;
            }
            await messageObserver.executeMessageActions(client, messageData, this, playerSchema);
        }
    }

    // @TODO - BETA - Extract all world or bodies creation functions into a new physics driver.
    async createWorld(roomData, objectsManager)
    {
        await this.events.emit('reldens.createWorld', roomData, objectsManager, this);
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
        this.pointsValidator = new WorldPointsValidator(this.roomWorld.worldWidth, this.roomWorld.worldHeight);
        this.roomWorld.createLimits();
        await this.roomWorld.createWorldContent(roomData);
        // start world movement from the config or with the default value:
        this.worldTimer = new WorldTimer({
            clockInstance: this.clock,
            world: this.roomWorld,
            callbacks: [() => {
                if(!this.roomWorld){
                    Logger.error('Room World not longer exists.', this.roomWorld);
                    return;
                }
                this.roomWorld.removeBodiesFromWorld();
            }]
        });
        this.worldTimer.startWorldSteps();
        Logger.info('World created in Room: ' + this.roomName);
    }

    createWorldInstance(data)
    {
        return new P2world(data);
    }

    async nextSceneInitialPosition(client, data, playerBody)
    {
        let nextRoom = await this.loginManager.roomsManager.loadRoomByName(data.next);
        if(!nextRoom){
            Logger.error('Player room change error. Next room not found: ' + data.next);
            playerBody.isChangingScene = false;
            return;
        }
        let currentPlayer = this.playerBySessionIdFromState(client.sessionId);
        let newPosition = this.fetchNewPosition(nextRoom, data.prev);
        if(!newPosition){
            Logger.error('Can not find next room: '+nextRoom.roomName, {data, nextRoom});
            playerBody.isChangingScene = false;
            return;
        }
        currentPlayer.state.scene = data.next;
        currentPlayer.state.room_id = nextRoom.roomId;
        currentPlayer.state.x = newPosition.X;
        currentPlayer.state.y = newPosition.Y;
        currentPlayer.state.dir = newPosition.D;
        let stateSaved = await this.savePlayerState(client.sessionId);
        if(!stateSaved){
            Logger.error('Save state error: ' + client.sessionId);
            playerBody.isChangingScene = false;
            return;
        }
        this.broadcastSceneChange(client, currentPlayer, data);
    }

    fetchNewPosition(nextRoom, previousRoom)
    {
        if(0 === nextRoom.returnPoints.length){
            return false;
        }
        for(let newPosition of nextRoom.returnPoints){
            // @NOTE: P === false means there's only one room that would lead to this one. If there's more than one
            // possible return point then validate the previous room.
            // validate if previous room:
            if(newPosition.P && newPosition.P !== previousRoom){
                continue;
            }
            return newPosition;
        }
        return false;
    }

    broadcastSceneChange(client, currentPlayer, data)
    {
        // @NOTE: we need to broadcast the current player scene change to be removed or added in other players.
        let showPlayedTimeConfig = this.config.getWithoutLogs(
            'client/players/playedTime/show',
            GameConst.SHOW_PLAYER_TIME.NONE
        );
        this.broadcast('*', {
            act: GameConst.CHANGED_SCENE,
            id: client.sessionId,
            scene: currentPlayer.state.scene,
            prev: data.prev,
            x: currentPlayer.state.x,
            y: currentPlayer.state.y,
            dir: currentPlayer.state.dir,
            playerName: currentPlayer.playerName,
            playedTime: GameConst.SHOW_PLAYER_TIME.ALL_PLAYERS === showPlayedTimeConfig ? currentPlayer.playedTime : -1,

            avatarKey: currentPlayer.avatarKey
        });
        let bodyToRemove = currentPlayer.physicalBody;
        this.roomWorld.removeBody(bodyToRemove);
        // reconnect is to create the player in the new scene:
        client.send('*', {act: GameConst.RECONNECT, player: currentPlayer, prev: data.prev});
    }

    async removePlayer(sessionId)
    {
        let playerSchema = this.playerBySessionIdFromState(sessionId);
        let stateObject = {isRemoveReady: true};
        await this.events.emit('reldens.removePlayerBefore', {
            room: this,
            playerSchema,
            stateObject
        });
        if(playerSchema && stateObject.isRemoveReady){
            this.removeAllPlayerReferences(playerSchema, sessionId);
            return playerSchema;
        }
        ErrorManager.error('Player not found, session ID: ' + sessionId);
        return false;
    }

    removeAllPlayerReferences(playerSchema, sessionId)
    {
        let bodyToRemove = playerSchema.physicalBody;
        if(bodyToRemove){
            this.roomWorld.removeBody(bodyToRemove);
        }
        this.events.offByMasterKey(playerSchema.eventsPrefix + playerSchema.player_id);
        this.state.removePlayer(sessionId);
    }

    async savePlayerState(sessionId)
    {
        let playerSchema = this.playerBySessionIdFromState(sessionId);
        let {room_id, x, y, dir} = playerSchema.state;
        let playerId = playerSchema.player_id;
        let updatePatch = {room_id, x: parseInt(x), y: parseInt(y), dir};
        let updateReady = {continueUpdate: true};
        this.events.emitSync('reldens.onSavePlayerStateBefore', {
            room: this,
            playerSchema,
            playerId,
            updatePatch,
            updateReady
        });
        if(!updateReady.continueUpdate){
            return playerSchema;
        }
        let updateResult = await this.loginManager.usersManager.updateUserStateByPlayerId(playerId, updatePatch);
        if(!updateResult){
            Logger.error('Player update error: ' + playerId);
        }
        return playerSchema;
    }

    async savePlayerStats(playerSchema, client)
    {
        // @TODO - BETA - For now we are always updating all the stats but this can be improved to save only the ones
        //   that changed.
        let objectState = {updateReady: true};
        this.events.emitSync('reldens.onSavePlayerStatsBefore', {room: this, playerSchema, client, objectState});
        if(!objectState.updateReady){
            return false;
        }
        for(let i of Object.keys(playerSchema.stats)){
            let statId = this.config.client.players.initialStats[i].id;
            let statPatch = {
                value: playerSchema.stats[i],
                base_value: playerSchema.statsBase[i]
            };
            await this.loginManager.usersManager.updatePlayerStatByIds(playerSchema.player_id, statId, statPatch);
        }
        if(client){
            // @TODO - BETA - Convert all events in constants and consolidate them in a single file with descriptions.
            await this.events.emit('reldens.savePlayerStatsUpdateClient', client, playerSchema, this);
            client.send('*', {
                act: GameConst.PLAYER_STATS,
                stats: playerSchema.stats,
                statsBase: playerSchema.statsBase
            });
        }
        return true;
    }

    async savePlayedTime(playerSchema)
    {
        let currentlyPlayedTime = (Date.now() - playerSchema.playStartTime) / 1000;
        let playedTime = Number(playerSchema.playedTime)+Number(Number(currentlyPlayedTime).toFixed(0));
        playerSchema.playedTime = playedTime;
        let updateResult = await this.loginManager.usersManager.dataServer.getEntity('users').updateById(
            playerSchema.userId,
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

    fetchActivePlayerById(playerId)
    {
        // @TODO - BETA - Replace by secondary object activePlayersById using references to the same activePlayers.
        let activePlayersKeys = Object.keys(this.activePlayers);
        if(0 === activePlayersKeys.length){
            return false;
        }
        for(let i of activePlayersKeys){
            if(playerId.toString() === this.activePlayers[i].playerData.id.toString()){
                return this.activePlayers[i];
            }
        }
        return false;
    }

    onDispose()
    {
        Logger.info('ON-DISPOSE Room: ' + this.roomName);
        this.clearMovementIntervals();
        clearInterval(this.roomWorld.worldTimer);
        // @TODO - BETA - Replace this by a master key related to the room ID and just remove all the events related
        //   to this room.
        if(!this.roomWorld.respawnAreas){
            return true;
        }
        // clean up the listeners!
        // @TODO - BETA - Emit a new event for the room dispose and use listeners on each other core-plugin.
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

    addObjectStateSceneData(object)
    {
        let sceneData = sc.toJson(this.state.sceneData);
        sceneData.objectsAnimationsData[object.objectIndex] = this.roomData.objectsAnimationsData[object.objectIndex];
        for(let objectAsset of object.objects_assets){
            sceneData.preloadAssets.push(objectAsset);
        }
        this.state.sceneData = JSON.stringify(sceneData);
    }

    deleteObjectSceneData(object)
    {
        let sceneData = sc.toJson(this.state.sceneData);
        delete sceneData.objectsAnimationsData[object.objectIndex];
        for(let objectAsset of object.objects_assets){
            sceneData.preloadAssets = sceneData.preloadAssets.filter(obj => obj.object_id !== objectAsset.object_id);
        }
        this.state.sceneData = JSON.stringify(sceneData)
    }

    disableOnDispose()
    {
        this.autoDispose = false;
    }

    enableOnDispose()
    {
        this.autoDispose = true;
    }
}

module.exports.RoomScene = RoomScene;
