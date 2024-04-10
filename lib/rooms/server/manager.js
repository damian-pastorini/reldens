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
        this.dataServer = sc.get(props, 'dataServer', false);
        if(!this.dataServer){
            Logger.error('DataServer undefined in RoomsManager.');
        }
        this.loadedRooms = false;
        this.loadedRoomsById = false;
        this.loadedRoomsByName = false;
        this.defineExtraRooms = [];
        this.definedRooms = {};
        this.createdInstances = {};
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
        Logger.info(`Total rooms loaded: ${counter}`);
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
            Logger.info('Loaded extra room: '+roomData.roomName);
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
            dataServer: this.dataServer
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
            'rooms_change_points.next_room',
            'rooms_return_points.from_room'
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
        let propertyLabel = property.charAt(0).toUpperCase()+property.slice(1);
        let managerProperty = 'loadedRoomsBy'+propertyLabel;
        if(this[managerProperty][value]){
            return this[managerProperty][value];
        }
        let room = await this.dataServer.getEntity('rooms').loadBy(property, value);
        if(room){
            let temp = this.generateRoomModel(room);
            if(!temp){
                Logger.critical('Loading room by "'+property+'" with value "'+value+'", model could not be generated.');
                return false;
            }
            this.loadedRooms.push(temp);
            this.loadedRoomsById[room.id] = temp;
            this.loadedRoomsByName[room.name] = temp;
            return temp;
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
            // @NOTE: the roomMap is the map file name without the extension (the extension is only used in the admin).
            roomMap: (room?.map_filename || '').toString().replace(/^.*[\\/]/, '').replace(/\.[^.]*$/, ''),
            sceneImages: room.scene_images.split(','),
            changePoints: [],
            returnPoints: [],
            roomClassPath: room.room_class_key,
            returnPointDefault: false,
            customData: sc.toJson(room.customData, {})
        };
        for(let changePoint of room.rooms_change_points){
            let changePointData = {};
            changePointData[RoomsConst.TILE_INDEX] = changePoint.tile_index;
            changePointData[RoomsConst.NEXT_SCENE] = changePoint.next_room.name;
            roomDataModel.changePoints.push(changePointData);
        }
        for(let returnPosition of room.rooms_return_points){
            let fromRoom = returnPosition.from_room ? returnPosition.from_room.name : false;
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
            Logger.error('Return points found for room: '+roomDataModel.roomName+'. Room ID: '+roomDataModel.roomId);
        }
        if(!roomDataModel.returnPointDefault){
            roomDataModel.returnPointDefault = roomDataModel.returnPoints[0];
        }
        return roomDataModel;
    }

}

module.exports.RoomsManager = RoomsManager;
