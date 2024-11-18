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
const { DropObject } = require('../../objects/server/object/type/drop-object');
const { ObjectsConst } = require('../../objects/constants');
const { JoinedSceneRoomEvent } = require('./events/joined-scene-room-event');
const { RandomPlayerState } = require('./random-player-state');
const { RoomsConst } = require('../constants');
const { WorldConst } = require('../../world/constants');
const { GameConst } = require('../../game/constants');
const { ErrorManager, Logger, sc } = require('@reldens/utils');

class RoomScene extends RoomLogin
{

    async onCreate(options)
    {
        super.onCreate(options);
        Logger.notice('Creation process started for RoomScene "'+this.roomName+'" (ID: '+this.roomId+').');
        this.autoDispose = sc.get(options.roomData, 'autoDispose', false);
        this.disposeTimeoutMs = this.config.getWithoutLogs('server/rooms/disposeTimeout', 300000);
        this.disposeTimeoutTimer = false;
        this.roomWorld = {};
        this.messageActions = {};
        this.movementInterval = {};
        this.playersLastStateTimers = {};
        this.worldTimerCallback = false;
        this.roomType = RoomsConst.ROOM_TYPE_SCENE;
        this.validateRoomData = true;
        this.sceneId = this.roomId;
        // @NOTE: we create an instance of the objects manager for each room-scene, this is on purpose so all the
        // related object instances will be removed when the room is disposed.
        let objectsManagerConfig = Object.assign(
            {events: this.events, roomName: this.roomName, roomId: this.roomId},
            options
        );
        this.objectsManager = new ObjectsManager(objectsManagerConfig);
        await this.objectsManager.loadObjectsByRoomId(options.roomData.roomId);
        if(this.objectsManager.roomObjectsData){
            await this.objectsManager.generateObjects();
            //Logger.debug('Generated objects keys: '+JSON.stringify((Object.keys(this.objectsManager.roomObjectsData))));
        }
        // append objects that will listen messages:
        if(this.objectsManager.listenMessages){
            Object.assign(this.messageActions, this.objectsManager.listenMessagesObjects);
        }
        this.lastCallTime = Date.now() / 1000;
        this.paused = false;
        this.customData = options.roomData.customData || {};
        this.joinInRandomPlace = Boolean(this.customData.joinInRandomPlace || false);
        this.joinInRandomPlaceAlways = Boolean(this.customData.joinInRandomPlaceAlways || false);
        this.joinInRandomPlaceGuestAlways = Boolean(this.customData.joinInRandomPlaceGuestAlways || false);
        if(this.customData.patchRate){
            //Logger.debug('Setting custom patch rate: '+this.customData.patchRate);
            this.setPatchRate(this.customData.patchRate);
        }
        WorldConfig.mapWorldConfigValues(this, this.config);
        this.allowSimultaneous = this.config.get('client/general/controls/allowSimultaneousKeys', true);
        await this.createWorld(options.roomData, this.objectsManager);
        this.applyPlayersLastStateHandler = Boolean(this.config.getWithoutLogs('server/players/stateHandler/enabled'));
        this.applyStateOnZeroAffectedProperty = this.config.getWithoutLogs(
            'server/players/state/forZeroAffectedProperty',
            GameConst.STATUS.DEATH
        );
        this.playersAffectedProperty = this.config.get('client/actions/skills/affectedProperty');
        this.playerBodyWidth = this.config.get('client/players/physicalBody/width');
        this.playerBodyHeight = this.config.get('client/players/physicalBody/height');
        this.playersStateHandlerTimeOut = Number(
            this.config.getWithoutLogs('server/players/stateHandler/timeOut', 10000)
        );
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
        this.randomPlayerState = this.joinInRandomPlace ? new RandomPlayerState(this) : false;
        await this.events.emit('reldens.sceneRoomOnCreate', this);
        Logger.notice(
            'Created RoomScene: '+this.roomName+' ('+this.roomId+') - AutoDispose: '+(this.autoDispose ? 'Yes' : 'No')
        );
        delete options.roomsManager.creatingInstances[this.roomName];
    }

    async onJoin(client, options, userModel)
    {
        if(this.disposeTimeoutTimer){
            //Logger.debug('Cleared dispose timeout on room "'+this.roomName+'".');
            clearTimeout(this.disposeTimeoutTimer);
            this.disposeTimeoutTimer = false;
        }
        await this.events.emit('reldens.joinRoomStart', this, client, options, userModel);
        if(sc.hasOwn(options, 'selectedPlayer')){
            userModel.selectedPlayer = options.selectedPlayer;
            userModel.player = this.getPlayerByIdFromArray(userModel.players, options.selectedPlayer);
        }
        let isGuest = -1 !== userModel.email.indexOf(this.guestEmailDomain);
        if(this.validateRoomData){
            if(!this.validateRoom(userModel.player.state.scene, isGuest)){
                await this.events.emit('reldens.joinRoomInvalid', this, client, options, userModel, isGuest);
                return false;
            }
        }
        let loggedPlayer = await this.createPlayerOnScene(client, userModel, isGuest);
        // we do not need to create a player entity since we only need the name for the chat:
        this.loginManager.activePlayers.add(userModel, client, this);
        await this.events.emit(
            'reldens.joinRoomEnd',
            new JoinedSceneRoomEvent(this, client, options, userModel, loggedPlayer, isGuest)
        );
    }

    async disconnectBySessionId(sessionId, client, userModel)
    {
        let player = this.playerBySessionIdFromState(sessionId);
        if(!player){
            //Logger.debug('Player not found for disconnection by session ID "'+sessionId+'".');
            return false;
        }
        await this.events.emit('reldens.disconnectLoggedBefore', {room: this, player, client, userModel});
        await this.savePlayedTime(player);
        let savedStats = await this.savePlayerStats(player);
        let savedState = await this.savePlayerState(sessionId);
        if(savedState && savedStats){
            await this.removePlayer(sessionId);
        }
        return true;
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

    async createPlayerOnScene(client, userModel, isGuest)
    {
        await this.events.emit('reldens.createPlayerBefore', client, userModel, this);
        let currentPlayer = this.state.createPlayerSchema(userModel, client.sessionId);
        this.handlePlayerLastState(currentPlayer);
        if(this.randomPlayerState){
            this.randomPlayerState.randomizeLocation(currentPlayer, isGuest);
        }
        // @TODO - BETA - Remove this callbacks and provide a player container that will executed the required methods.
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
            width: this.playerBodyWidth,
            height: this.playerBodyHeight,
            bodyState: currentPlayer.state,
            speed: Number(currentPlayer.stats?.speed || 0)
        });
        await this.events.emit('reldens.createPlayerAfter', client, userModel, currentPlayer, this);
        return currentPlayer;
    }

    handlePlayerLastState(currentPlayer)
    {
        if(!this.applyPlayersLastStateHandler){
            return false;
        }
        // @TODO - BETA - Include a timer and a configuration to avoid player been attacked automatically after login.
        if(!this.playersAffectedProperty){
            return false;
        }
        let hasLife = 0 < Number(sc.get(currentPlayer.stats, this.playersAffectedProperty, 0));
        if(hasLife){
            return false;
        }
        currentPlayer.state.inState = this.applyStateOnZeroAffectedProperty;
        this.playersLastStateTimers[currentPlayer.player_id] = setTimeout(
            () => {
                currentPlayer.state.inState = GameConst.STATUS.ACTIVE;
            },
            this.playersStateHandlerTimeOut
        );
        return false;
    }

    async onLeave(client, consented)
    {
        let playerSchema = this.playerBySessionIdFromState(client.sessionId);
        if(!playerSchema){
            // this is expected when the player is automatically disconnected on the second login:
            // Logger.info('Save error, schema not found for session ID: '+client.sessionId, client.auth.username);
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
        let isChangingScene = playerSchema.physicalBody?.isChangingScene;
        let removed = await this.removePlayer(client.sessionId);
        if(!removed){
            Logger.error('Player remove error.', playerSchema);
        }
        clearTimeout(this.playersLastStateTimers[playerSchema.player_id]);
        this.removeActivePlayer(playerSchema, client, isChangingScene);
        if(0 === this.clients.length){
            //Logger.debug('Setting dispose timeout ('+this.disposeTimeoutMs+'ms) on room "'+this.roomName+'".');
            this.disposeTimeoutTimer = setTimeout(() => {
                this.disconnect();
            }, this.disposeTimeoutMs);
        }
    }

    async handleReceivedMessage(client, messageData)
    {
        if(!messageData){
            Logger.error('Empty message data on room "'+this.roomName+'" ID "'+this.roomId+'".', client, messageData);
            return;
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
        if(playerSchema.isDeath() || playerSchema.isDisabled()){
            this.clearMovementIntervals(playerSchema.player_id);
            bodyToMove.stopMove();
            return false;
        }
        if(GameConst.STOP === messageData.act){
            this.clearMovementIntervals(playerSchema.player_id);
            bodyToMove.stopMove();
        }
        let bodyCanMove = !bodyToMove.isChangingScene && !bodyToMove.isBlocked;
        if(!bodyCanMove){
            return false;
        }
        if(sc.hasOwn(messageData, 'dir')){
            // @TODO - BETA - Create a single class/point for setIntervals or timeOuts instances creation.
            let playerMovementIntervalKey = playerSchema.player_id+'_'+messageData.dir;
            if(!bodyToMove.world.timeStep){
                return false;
            }
            this.movementInterval[playerMovementIntervalKey] = setInterval(
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
            this.clearMovementIntervals(playerSchema.player_id);
            bodyToMove.stopMove();
            messageData = this.pointsValidator.makeValidPoints(messageData);
            bodyToMove.moveToPoint(messageData);
        }
    }

    activatePlayer(playerSchema, playerNewState)
    {
        //Logger.debug('Activate player "'+playerSchema.player_id+'".');
        playerSchema.state.inState = playerNewState;
        let bodyToMove = sc.get(playerSchema, 'physicalBody', false);
        this.activateBody(bodyToMove, playerSchema.player_id, playerNewState);
    }

    activateBody(bodyToMove, playerId, playerNewState)
    {
        if(!bodyToMove){
            //Logger.warning('Activate Player ID "'+playerId+'" body not found.');
            return false;
        }
        bodyToMove.isBlocked = false;
        bodyToMove.bodyState.inState = playerNewState;
        return true;
    }

    deactivatePlayer(playerSchema, playerNewState)
    {
        Logger.debug('Deactivate player "'+playerSchema.player_id+'", new inState value "'+playerNewState+'".');
        this.clearMovementIntervals(playerSchema.player_id);
        playerSchema.state.inState = playerNewState;
        this.deactivateBody(sc.get(playerSchema, 'physicalBody', false), playerSchema, playerNewState);
    }

    deactivateBody(bodyToMove, playerId, playerNewState)
    {
        if(!bodyToMove){
            Logger.warning('Deactivate Player ID "'+playerId+'" body not found.');
            return false;
        }
        bodyToMove.stopFull();
        bodyToMove.resetAuto();
        bodyToMove.isBlocked = true;
        bodyToMove.bodyState.inState = playerNewState;
        return true;
    }

    clearMovementIntervals(playerId)
    {
        let intervalKeys = Object.keys(this.movementInterval);
        for(let i of intervalKeys){
            if(playerId && 0 !== i.indexOf(playerId+'_')){
                continue;
            }
            clearInterval(this.movementInterval[i]);
            delete this.movementInterval[i];
            // Logger.debug('Cleared movement interval: '+i);
        }
    }

    async executeSceneMessageActions(client, messageData, playerSchema)
    {
        let event = {room: this, client, messageData, playerSchema, canContinue: true};
        await this.events.emit('reldens.beforeSceneExecuteMessages', event);
        if(!event.canContinue){
            return;
        }
        let messageActionsKeys = Object.keys(this.messageActions);
        if(0 === messageActionsKeys.length){
            return;
        }
        if(!this.isAllowedAction(client, messageData, playerSchema)){
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

    isAllowedAction(client, messageData, playerSchema)
    {
        if(this.customData.allActionsDisabled){
            return false;
        }
        let disallowedActions = sc.get(this.customData, 'disallowedActions', {});
        if(0 === Object.keys(disallowedActions).length){
            return true;
        }
        if(sc.inArray(messageData['act'], disallowedActions)){
            return false;
        }
        let playerSkill = playerSchema.skillsServer.classPath.currentSkills[messageData.type] || {};
        let skillTypeClass = playerSkill?.constructor?.name;
        if(skillTypeClass && sc.inArray(skillTypeClass, disallowedActions)){
            return false;
        }
        let target = messageData.target?.type;
        if(!target){
            return true;
        }
        if(sc.inArray('target-'+target, disallowedActions)){
            return false;
        }
        if(sc.inArray('target-'+target+'-'+messageData['act'], disallowedActions)){
            return false;
        }
        return !sc.inArray('target-'+target+'-'+skillTypeClass, disallowedActions);
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
        this.validateWorldContents(roomData.roomMap);
        await this.roomWorld.createWorldContent(roomData);
        this.initializeWorldTimer();
        Logger.info('World created in Room: ' + this.roomName);
    }

    validateWorldContents(roomMap)
    {
        if(!sc.get(this.config.server, 'validateMaps', true)){
            return;
        }
        let mapJson = sc.get(this.config.server.maps, roomMap, false);
        if(!mapJson){
            Logger.critical('Undefined map JSON on config server maps: "'+this.sceneTiledMapFile+'"');
            return;
        }
        let contentsLayers = Object.keys(this.objectsManager.roomObjectsByLayer);
        let mapLayers = mapJson.layers.map((layer) => layer.name);
        let missingLayers = contentsLayers.filter(layer => !mapLayers.includes(layer));
        if(0 < missingLayers.length){
            Logger.warning(
                'There are objects assigned to the room but that contain invalid layer names.',
                missingLayers
            );
            for(let missingLayer of missingLayers){
                let layerObjectsIds = Object.keys(this.objectsManager.roomObjectsByLayer[missingLayers]);
                Logger.warning('Layer "'+missingLayer+'" invalid objects ID(s): '+JSON.stringify(layerObjectsIds));
            }
        }
    }

    initializeWorldTimer()
    {
        this.worldTimerCallback = () => {
            if(!this.roomWorld){
                Logger.error('Room World not longer exists.', this.roomWorld);
                return;
            }
            this.roomWorld.removeBodiesFromWorld();
        };
        this.worldTimer = new WorldTimer({
            // @TODO - BETA - Create a single class/point for setIntervals or timeOuts instances creation.
            // clockInstance: this.clock,
            world: this.roomWorld,
            callbacks: [this.worldTimerCallback]
        });
        this.worldTimer.startWorldSteps(this.roomWorld);
    }

    createWorldInstance(data)
    {
        return new P2world(data);
    }

    async nextSceneInitialPosition(client, data, playerBody)
    {
        let currentPlayer = this.playerBySessionIdFromState(client.sessionId);
        if(!currentPlayer){
            Logger.error('Player not found by session ID:' + client.sessionId);
            return;
        }
        this.broadcast('*', {
            act: GameConst.CHANGING_SCENE,
            id: client.sessionId,
            scene: currentPlayer.state.scene,
            prev: data.prev,
        });
        let nextRoom = await this.loginManager.roomsManager.loadRoomByName(data.next);
        if(!nextRoom){
            Logger.error('Player room change error. Next room not found: ' + data.next);
            playerBody.isChangingScene = false;
            return;
        }
        let newPosition = this.fetchNewPosition(nextRoom, data.prev);
        if(!newPosition){
            Logger.error('Can not find next room: '+nextRoom.roomName, {data, nextRoom, newPosition});
            playerBody.isChangingScene = false;
            return;
        }
        currentPlayer.state.scene = data.next;
        currentPlayer.state.room_id = nextRoom.roomId;
        currentPlayer.state.x = newPosition[RoomsConst.RETURN_POINT_KEYS.X];
        currentPlayer.state.y = newPosition[RoomsConst.RETURN_POINT_KEYS.Y];
        currentPlayer.state.dir = newPosition[RoomsConst.RETURN_POINT_KEYS.DIRECTION];
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
            Logger.warning('Next room "'+nextRoom.roomName+'" has no return points.', nextRoom);
            return false;
        }
        for(let newPosition of nextRoom.returnPoints){
            // @NOTE: P === false means there's only one room that would lead to this one. If there's more than one
            // possible return point then validate the previous room.
            // validate if previous room:
            if(
                newPosition[RoomsConst.RETURN_POINT_KEYS.PREVIOUS]
                && newPosition[RoomsConst.RETURN_POINT_KEYS.PREVIOUS] !== previousRoom
            ){
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
        if(sc.isFunction(this.roomWorld.removeBody)){
            this.roomWorld.removeBody(bodyToRemove);
        }
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
            Logger.debug('Removed player: '+playerSchema.playerName+' - Session ID: '+sessionId);
            return playerSchema;
        }
        ErrorManager.error('Player not found, session ID: ' + sessionId);
        return false;
    }

    removeAllPlayerReferences(playerSchema, sessionId)
    {
        this.events.offByMasterKey(playerSchema.eventsPrefix);
        let bodyToRemove = playerSchema.physicalBody;
        if(sc.isFunction(this.roomWorld.removeBody) && bodyToRemove){
            this.roomWorld.removeBody(bodyToRemove);
        }
        playerSchema.physicalBody = null;
        let itemsList = playerSchema?.inventory?.manager?.items || {};
        let itemsKeys = Object.keys(itemsList);
        if(0 < itemsKeys.length){
            for(let i of itemsKeys){
                let item = itemsList[i];
                if(item.useTimer){
                    clearTimeout(item.useTimer);
                }
                if(item.execTimer){
                    clearTimeout(item.execTimer);
                }
            }
        }
        this.clearEntityActions(playerSchema);
        // these contain references to the room:
        delete playerSchema.skillsServer?.client;
        delete playerSchema.inventory?.client;
        playerSchema.executePhysicalSkill = null;
        playerSchema.persistData = null;
        playerSchema.skillsServer = null;
        playerSchema.inventory = null;
        let playerDeathTimer = playerSchema.getPrivate('playerDeathTimer');
        if(playerDeathTimer){
            clearTimeout(playerDeathTimer);
        }
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
        let updateResult = false;
        let errorMessage = '';
        try {
            updateResult = await this.loginManager.usersManager.updateUserStateByPlayerId(playerId, updatePatch);
        } catch (error) {
            errorMessage = error.message;
        }
        if(!updateResult){
            Logger.error('Player with ID "'+playerId+'" update error. ' + errorMessage);
            return false;
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
        return this.loginManager.usersManager.updatePlayedTimeAndLogoutDate(playerSchema);
    }

    getClientById(clientId)
    {
        let client = this.activePlayerBySessionId(clientId, this.roomId)?.client;
        if(client){
            return client;
        }
        Logger.debug('Fetching client "'+clientId+'" from RoomScene.clients.');
        if(!this.clients){
            return false;
        }
        for(let client of this.clients){
            if(client.sessionId === clientId){
                return client;
            }
        }
        Logger.debug('Expected when disconnects, client "'+clientId+'" not found in RoomScene.clients.');
        return false;
    }

    async createDropObjectInRoom(dropObjectData, worldObjectData)
    {
        let roomObject = await this.objectsManager.generateObjectFromObjectData(dropObjectData);
        let { layerName, tileIndex, tileWidth, tileHeight, x, y } = worldObjectData;
        await this.roomWorld.createRoomObjectBody({ name: layerName }, tileIndex, tileWidth, tileHeight, x, y);
        if(!roomObject){
            Logger.error('Object body could not be created.', {dropObjectData, worldObjectData});
            return false;
        }
        this.addObjectStateSceneData(roomObject);
        this.setObjectAutoDestroyTime(roomObject);
        if(roomObject.objectBody){
            Logger.debug('Creating drop object with body and collision group: "'+WorldConst.COLLISIONS.DROP+'".');
            roomObject.objectBody.originalCollisionGroup = WorldConst.COLLISIONS.DROP;
            for(let shape of roomObject.objectBody.shapes){
                shape.collisionGroup = WorldConst.COLLISIONS.DROP;
                shape.collisionMask = roomObject.objectBody.world.collisionsGroupsByType[WorldConst.COLLISIONS.DROP];
            }
        }
        return roomObject;
    }

    setObjectAutoDestroyTime(roomObject)
    {
        let objectLifeTime = Number(this.config.getWithoutLogs('server/objects/drops/disappearTime', 0));
        if(0 === objectLifeTime){
            return false;
        }
        return setTimeout(() => {
            if(!this.objectsManager){
                return false;
            }
            if(!this.objectsManager.getObjectData(roomObject.objectIndex)){
                return false;
            }
            this.removeObject(roomObject);
        }, objectLifeTime);
    }

    removeObject(roomObject)
    {
        if(sc.isFunction(this.roomWorld.removeBody)){
            this.roomWorld.removeBody(roomObject.objectBody);
        }
        this.objectsManager.removeObjectData(roomObject);
        this.deleteObjectSceneData(roomObject);
        if(!this.hasActiveDroppedObjects()){
            this.enableAutoDispose();
        }
        this.broadcast('*', {act: ObjectsConst.DROPS.REMOVE, id: roomObject.objectIndex});
    }

    hasActiveDroppedObjects()
    {
        for(let roomObject of Object.values(this.objectsManager.roomObjects)){
            if(roomObject instanceof DropObject){
                return true
            }
        }
        return false;
    }

    onDispose()
    {
        if(!this.loginManager){
            // expected when a room throws a CREATING_ROOM_AWAIT error and the room can be disposed automatically:
            Logger.debug('Expected, LoginManager was not set as the created instance.', this.roomName, this.roomId);
            return false;
        }
        let createdRoomId = this.loginManager.roomsManager.instanceIdByName[this.roomName];
        if(!createdRoomId){
            Logger.warning('Room ID was not set on the created instances.', this.roomName, this.roomId);
        }
        if(createdRoomId && this.roomId !== createdRoomId){
            Logger.debug('Avoiding dispose for awaiting room creation.', this.roomName, this.roomId)
            return true;
        }
        return new Promise((resolve) => {
            try {
                Logger.info('Starting dispose of RoomScene "'+this.roomName+'" (ID: '+this.roomId+')');
                this.logEventsData('before');
                this.clearMovementIntervals();
                this.clearWorldTimers();
                this.cleanUpRoomWorld();
                this.clearPlayersTimers();
                // @TODO - BETA - Replace the following two methods to use a single master key related to the room ID.
                this.handleRespawnOnRoomDispose();
                this.handleObjectsManagerOnRoomDispose();
                delete this.objectsManager;
                delete this.roomWorld;
                this.roomWorld = {};
                this.events.offByMasterKey(this.roomName + '-' + this.roomId);
                super.onDispose();
                this.logEventsData('after');
            } catch (error) {
                resolve({confirm: false, error});
            }
            Logger.info('Disposed RoomScene "'+this.roomName+'" (ID: '+this.roomId+').');
            resolve({confirm: true});
        });
    }

    clearPlayersTimers()
    {
        if(0 === this.playersCountInState()){
            return false;
        }
        for(let i of this.playersKeysFromState()){
            let playerSchema = this.playerBySessionIdFromState(i);
            clearTimeout(playerSchema?.actions?.pvp?.playerReviveTimer);
        }
    }

    cleanUpRoomWorld()
    {
        this.roomWorld.removeBodies.push(this.objectBody);
        this.roomWorld._listeners['postBroadphase'] = [];
        this.roomWorld._listeners['preSolve'] = [];
        this.roomWorld._listeners['beginContact'] = [];
        this.roomWorld._listeners['endContact'] = [];
        this.roomWorld.clear();
    }

    clearWorldTimers()
    {
        clearInterval(this.roomWorld.worldDateTimeInterval);
        this.worldTimer.callbacks = [];
        this.worldTimer.clockInstance ? this.worldTimer.worldTimer.clear() : clearInterval(this.worldTimer.worldTimer);
        clearInterval(this.worldTimer.worldTimer);
        delete this.worldTimerCallback;
        this.worldTimerCallback = () => {
            // this serves as notification in case the room didn't clear the timers or events correctly:
            Logger.warning('World timer callback still executed for room "'+this.roomName+'".');
        };
        Logger.debug('Cleared world timer and world date time intervals.');
        this.worldTimer.world = null;
        this.worldTimer = null;
        delete this.worldTimer;
    }

    handleObjectsManagerOnRoomDispose()
    {
        if(!this.objectsManager.roomObjects){
            Logger.debug('None roomObjects defined for room: '+this.roomName);
            return;
        }
        for(let i of Object.keys(this.objectsManager.roomObjects)){
            let roomObject = this.objectsManager.roomObjects[i];
            roomObject.postBroadPhaseListener = [];
            this.clearEntityActions(roomObject);
            if(roomObject.battle){
                clearTimeout(roomObject.battle.battleTimer);
                clearTimeout(roomObject.battle.respawnStateTimer);
                roomObject.battle.targetObject = null;
            }
            clearTimeout(roomObject?.objectBody?.moveToOriginalPointTimer);
            clearTimeout(roomObject.respawnTimer);
            clearInterval(roomObject.respawnTimerInterval);
            clearTimeout(roomObject.isCasting);
            Logger.debug('Cleared timers for: ' + roomObject.key + ' / ' + i);
            delete this.objectsManager.roomObjects[i];
        }
    }

    clearEntityActions(entityInstance)
    {
        let actions = entityInstance?.actions || {};
        let actionsKeys = Object.keys(actions);
        if(0 === actionsKeys.length){
            return;
        }
        for(let i of actionsKeys){
            if(actions[i].room){
                actions[i].room = null;
            }
        }
    }

    handleRespawnOnRoomDispose()
    {
        if(!this.roomWorld.respawnAreas){
            Logger.debug('None respawn areas defined for room: '+this.roomName);
            return;
        }
        this.removeRespawnObjectsSubscribers();
        this.deleteRespawnObjectInstances();
    }

    deleteRespawnObjectInstances()
    {
        if(!this.roomWorld.respawnAreas){
            return;
        }
        for(let rI of Object.keys(this.roomWorld.respawnAreas)){
            let respawnInstancesCreated = this.roomWorld.respawnAreas[rI].instancesCreated;
            for(let i of Object.keys(respawnInstancesCreated)){
                delete respawnInstancesCreated[i];
                Logger.debug('Deleted respawn instances created: ' + i);
            }
            delete this.roomWorld.respawnAreas[rI];
            Logger.debug('Deleted respawn area created: ' + rI);
        }
        delete this.roomWorld.respawnAreas;
        Logger.debug('Deleted respawn areas for room: ' + this.roomName);
    }

    removeRespawnObjectsSubscribers()
    {
        if(!this.roomWorld.respawnAreas){
            return;
        }
        for(let rI of Object.keys(this.roomWorld.respawnAreas)){
            let respawnInstancesCreated = this.roomWorld.respawnAreas[rI].instancesCreated;
            for(let i of Object.keys(respawnInstancesCreated)){
                let respawnInstance = respawnInstancesCreated[i];
                for(let respawnObject of respawnInstance){
                    Logger.debug('Setting "battleEnd" listener off: ' + respawnObject.uid);
                    this.events.offByMasterKey(respawnObject.uid);
                }
            }
        }
    }

    logEventsData(eventKey)
    {
        let endSubscribersCount = 0;
        let keysData = {};
        for(let i of Object.keys(this.events._events)){
            endSubscribersCount += this.events._events[i].length;
            keysData[i] = {keys: []};
            for(let event of this.events._events[i]){
                keysData[i].keys.push((event.fn.name || 'anonymous').replace('bound ', ''));
            }
            keysData[i].keys = keysData[i].keys.join(', ');
        }
        Logger.debug('Subscribers count '+eventKey+':', endSubscribersCount, keysData);
    }

    addObjectStateSceneData(object)
    {
        let sceneData = sc.toJson(this.state.sceneData);
        sceneData.objectsAnimationsData[object.objectIndex] = this.roomData.objectsAnimationsData[object.objectIndex];
        for(let objectAsset of object.objects_assets){
            sceneData.preloadAssets[(objectAsset.object_id || '') + (objectAsset.object_asset_id || '')] = objectAsset;
        }
        this.state.sceneData = JSON.stringify(sceneData);
    }

    deleteObjectSceneData(object)
    {
        let sceneData = sc.toJson(this.state.sceneData);
        delete sceneData.objectsAnimationsData[object.objectIndex];
        for(let objectAsset of object.objects_assets){
            delete sceneData.preloadAssets[(objectAsset.object_id || '') + (objectAsset.object_asset_id || '')];
        }
        this.state.sceneData = JSON.stringify(sceneData)
    }

    disableAutoDispose()
    {
        this.autoDispose = false;
    }

    enableAutoDispose()
    {
        this.autoDispose = true;
    }
}

module.exports.RoomScene = RoomScene;
