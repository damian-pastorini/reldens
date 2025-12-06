/**
 *
 * Reldens - RoomsManager
 *
 */

const { RoomGame } = require('./game');
const { RoomScene } = require('./scene');
const { RoomsConst } = require('../constants');
const { GameConst } = require('../../game/constants');
const { ErrorManager, Logger, sc } = require('@reldens/utils');

class RoomsManager
{

    constructor(props)
    {
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in RoomsManager.');
        }
        /** @type {BaseDataServer} **/
        this.dataServer = sc.get(props, 'dataServer', false);
        if(!this.dataServer){
            Logger.error('DataServer undefined in RoomsManager.');
        }
        /** @type {ConfigProcessor} **/
        this.config = sc.get(props, 'config', false);
        if(!this.config){
            Logger.error('Config undefined in RoomsManager.');
        }
        this.loadedRooms = false;
        this.loadedRoomsById = false;
        this.loadedRoomsByName = false;
        this.defineExtraRooms = [];
        this.definedRooms = {};
        this.creatingInstances = {};
        this.createdInstances = {};
        this.instanceIdByName = {};
        this.availableRoomsGuest = {};
        this.registrationAvailableRooms = {};
        this.registrationAvailableRoomsGuest = {};
        this.loginAvailableRooms = {};
        this.loginAvailableRoomsGuest = {};
        this.setupConfiguration();
    }

    setupConfiguration()
    {
        if(!this.config){
            return false;
        }
        this.selectionConfig = this.config.get('client/rooms/selection', {});
        this.allowGuestOnRooms = this.config.getWithoutLogs('server/players/guestUser/allowOnRooms', true);
    }

    async defineRoomsInGameServer(gameServer, props)
    {
        await this.events.emit('reldens.roomsDefinition', this.defineExtraRooms);
        if(!this.defineExtraRooms.length){
            Logger.info('None extra rooms to be defined.');
        }
        // dispatch event to get the global message actions (that will be listened by every room):
        let globalMessageActions = {};
        await this.events.emit('reldens.roomsMessageActionsGlobal', globalMessageActions);
        // lobby room:
        await this.defineRoom(gameServer, GameConst.ROOM_GAME, RoomGame, props, globalMessageActions);
        Logger.info('Loaded game room using stored configuration.');
        let counter = await this.defineExtraRoomsInGameServer(gameServer, props, globalMessageActions);
        let rooms = await this.loadRooms();
        // register room-scenes from storage:
        counter = await this.defineRoomsFromModels(rooms, props, gameServer, globalMessageActions, counter);
        Logger.info('Total rooms loaded: '+counter);
        // save rooms lists data for clients:
        if(this.config.client?.rooms?.selection){
            this.config.client.rooms.selection.availableRooms = {
                registration: this.registrationAvailableRooms,
                registrationGuest: this.registrationAvailableRoomsGuest,
                login: this.loginAvailableRooms,
                loginGuest: this.loginAvailableRoomsGuest
            };
        }
        await this.events.emit('reldens.defineRoomsInGameServerDone', this);
        return this.definedRooms;
    }

    async defineRoomsFromModels(rooms, props, gameServer, globalMessageActions, counter)
    {
        if(0 === rooms.length){
            return counter;
        }
        for(let roomModel of rooms){
            let roomClass = RoomScene;
            if(roomModel.roomClassPath){
                let roomClassDefinition = props.config.get('server/customClasses/roomsClass/'+roomModel.roomClassPath);
                if(!roomClassDefinition){
                    Logger.error('Custom room class not found for room ID "'+roomModel.roomId+'".');
                    continue;
                }
                roomClass = roomClassDefinition;
            }
            await this.defineRoom(gameServer, roomModel.roomName, roomClass, props, globalMessageActions, roomModel);
            counter++;
            Logger.info('Loaded room: '+roomModel.roomName);
        }
        return counter;
    }

    async defineExtraRoomsInGameServer(gameServer, props, globalMessageActions)
    {
        if(0 === this.defineExtraRooms.length){
            return 0;
        }
        let counter = 0;
        for(let roomData of this.defineExtraRooms){
            await this.defineRoom(gameServer, roomData.roomName, roomData.room, props, globalMessageActions);
            counter++;
            Logger.info('Loaded extra room: '+roomData.roomName+(roomData.serverUrl ? '('+roomData.serverUrl+')' : ''));
        }
        return counter;
    }

    async defineRoom(gameServer, roomName, roomClass, props, globalMessageActions, roomModel = false)
    {
        let roomMessageActions = Object.assign({}, globalMessageActions);
        // run message actions event for each room:
        await this.events.emit('reldens.roomsMessageActionsByRoom', roomMessageActions, roomName);
        let roomProps = {
            loginManager: props.loginManager,
            config: props.config,
            messageActions: roomMessageActions,
            events: this.events,
            roomsManager: this,
            dataServer: this.dataServer,
            featuresManager: props.featuresManager
        };
        if(roomModel){
            roomProps.roomData = roomModel;
        }
        gameServer.define(roomName, roomClass, roomProps);
        this.definedRooms[roomName] = {roomClass, roomProps};
    }

    async loadRooms()
    {
        // @TODO - BETA - This will change when hot-plug is introduced.
        if(this.loadedRooms){
            return this.loadedRooms;
        }
        let roomsModels = await this.dataServer.getEntity('rooms').loadAllWithRelations([
            'related_rooms_change_points_room.related_rooms_next_room',
            'related_rooms_return_points_room.related_rooms_from_room'
        ]);
        if(!roomsModels){
            ErrorManager.error('None rooms found in the database. A room is required to run.');
        }
        let rooms = [];
        let roomsById = {};
        let roomsByName = {};
        for(let room of roomsModels){
            let temp = this.generateRoomModel(room);
            if(!temp){
                Logger.error('Room model could not be generated.', room);
                continue;
            }
            rooms.push(temp);
            roomsById[room.id] = temp;
            roomsByName[room.name] = temp;
        }
        this.loadedRooms = rooms;
        this.loadedRoomsById = roomsById;
        this.loadedRoomsByName = roomsByName;
        this.availableRoomsGuest = this.filterGuestRooms(roomsByName);
        let registrationRooms = this.filterRooms(true);
        this.registrationAvailableRooms = this.extractRoomDataForSelector(registrationRooms);
        this.registrationAvailableRoomsGuest = this.extractRoomDataForSelector(this.fetchGuestRooms(registrationRooms));
        let loginRooms = this.filterRooms(false);
        this.loginAvailableRooms = this.extractRoomDataForSelector(loginRooms);
        this.loginAvailableRoomsGuest = this.extractRoomDataForSelector(this.fetchGuestRooms(loginRooms));
        return this.loadedRooms;
    }

    async loadRoomById(roomId)
    {
        return this.loadRoomBy('id', roomId);
    }

    async loadRoomByName(roomName)
    {
        return this.loadRoomBy('name', roomName);
    }

    async loadRoomBy(property, value)
    {
        try {
            let propertyLabel = property.charAt(0).toUpperCase()+property.slice(1);
            //Logger.debug('Load rooms by: '+propertyLabel);
            let managerProperty = 'loadedRoomsBy'+propertyLabel; // see this.loadedById and this.loadedByName
            // first try to fetch a loaded room from the loadedRoomsBy properties:
            if(this[managerProperty][value]){
                return this[managerProperty][value];
            }
            // if the room was not preloaded when it was defined, then reloaded here:
            let room = await this.dataServer.getEntity('rooms').loadBy(property, value);
            if(!room){
                Logger.critical('Load room by "'+property+'" with value "'+value+'", not found.');
                return false;
            }
            let temp = this.generateRoomModel(room);
            if(!temp){
                Logger.critical('Loading room by "'+property+'" with value "'+value+'", model could not be generated.');
                return false;
            }
            this.loadedRooms.push(temp);
            this.loadedRoomsById[room.id] = temp;
            this.loadedRoomsByName[room.name] = temp;
            // @TODO - BETA - When moving rooms selection config to rooms.customData include new rooms ("temp") in:
            //    - registrationAvailableRooms
            //    - registrationAvailableRoomsGuest
            //    - loginAvailableRooms
            //    - loginAvailableRoomsGuest
            return temp;
        } catch (error) {
            Logger.critical('Load room by "'+property+'" with value "'+value+'" failed.', error);
        }
        return false;
    }

    generateRoomModel(room)
    {
        if(!sc.isObject(room) || 0 === Object.keys(room).length){
            Logger.critical('Room not available.', room);
            return false;
        }
        let roomDataModel = {
            roomId: room.id,
            roomName: room.name,
            roomTitle: room.title,
            serverUrl: room.server_url,
            // @NOTE: the roomMap is the map file name without the extension (the extension is only used in the admin).
            roomMap: (room?.map_filename || '').toString().replace(/^.*[\\/]/, '').replace(/\.[^.]*$/, ''),
            sceneImages: room.scene_images.split(','),
            changePoints: [],
            returnPoints: [],
            roomClassPath: room.room_class_key,
            returnPointDefault: false,
            customData: sc.toJson(room.customData, {})
        };
        for(let changePoint of room.related_rooms_change_points_room){
            let changePointData = {};
            changePointData[RoomsConst.TILE_INDEX] = changePoint.tile_index;
            changePointData[RoomsConst.NEXT_SCENE] = changePoint.related_rooms_next_room.name;
            roomDataModel.changePoints.push(changePointData);
        }
        for(let returnPosition of room.related_rooms_return_points_room){
            let fromRoom = returnPosition.related_rooms_from_room
                ? returnPosition.related_rooms_from_room.name
                : false;
            let position = {
                [RoomsConst.RETURN_POINT_KEYS.DIRECTION]: returnPosition.direction,
                [RoomsConst.RETURN_POINT_KEYS.X]: returnPosition.x,
                [RoomsConst.RETURN_POINT_KEYS.Y]: returnPosition.y,
                [RoomsConst.RETURN_POINT_KEYS.PREVIOUS]: fromRoom
            };
            if(sc.hasOwn(returnPosition, 'is_default') && returnPosition.is_default){
                position[RoomsConst.RETURN_POINT_KEYS.DEFAULT] = returnPosition.is_default;
                roomDataModel.returnPointDefault = position;
            }
            roomDataModel.returnPoints.push(position);
        }
        if(0 === roomDataModel.returnPoints.length){
            Logger.warning('Return points found for room: '+roomDataModel.roomName+'. Room ID: '+roomDataModel.roomId);
        }
        if(!roomDataModel.returnPointDefault){
            roomDataModel.returnPointDefault = roomDataModel.returnPoints[0];
        }
        return roomDataModel;
    }

    filterRooms(forRegistration)
    {
        // @TODO - BETA - Move rooms selection configuration to rooms.customData.
        let configuredRooms = this.fetchConfiguredRoomsList(forRegistration);
        if('*' === configuredRooms){
            return this.loadedRoomsByName;
        }
        return this.filterValidRooms(configuredRooms.split(','), this.loadedRoomsByName);
    }

    fetchConfiguredRoomsList(forRegistration)
    {
        if(forRegistration){
            return this.selectionConfig.registrationAvailableRooms;
        }
        return this.selectionConfig.loginAvailableRooms;
    }

    filterValidRooms(configuredRooms, createdRooms)
    {
        let validRooms = [];
        for(let roomName of configuredRooms){
            if(sc.hasOwn(createdRooms, roomName)){
                validRooms.push(configuredRooms[roomName]);
            }
        }
        return validRooms;
    }

    fetchGuestRooms(availableRooms)
    {
        if(this.allowGuestOnRooms){
            return availableRooms;
        }
        return this.filterGuestRooms(availableRooms);
    }

    filterGuestRooms(availableRooms)
    {
        if(!sc.isObject(availableRooms)){
            Logger.debug('The provided "availableRooms" is not an object.', availableRooms);
            return {};
        }
        let validRooms = {};
        for(let i of Object.keys(availableRooms)){
            let room = availableRooms[i];
            let customData = room.customData || {};
            if(sc.get(customData, 'allowGuest')){
                validRooms[room.roomName] = room;
            }
        }
        return validRooms;
    }

    extractRoomDataForSelector(availableRooms)
    {
        let titles = [];
        for(let i of Object.keys(availableRooms)){
            titles.push({name: availableRooms[i].roomName, title: availableRooms[i].roomTitle});
        }
        return titles;
    }

}

module.exports.RoomsManager = RoomsManager;
