/**
 *
 * Reldens - RoomsManager
 *
 * This class will load the rooms information and define them in the server.
 *
 */

const { RoomsModel } = require('./model');
const { RoomGame } = require('./game');
const { RoomScene } = require('./scene');
const { GameConst } = require('../../game/constants');
const { ErrorManager, Logger, sc } = require('@reldens/utils');

class RoomsManager
{

    constructor(props)
    {
        this.events = sc.getDef(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in RoomsManager.');
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
        // dispatch event to get the global message actions (that will be listen by every room):
        let globalMessageActions = {};
        await this.events.emit('reldens.roomsMessageActionsGlobal', globalMessageActions);
        // loaded rooms counter:
        let counter = 0;
        // lobby room:
        await this.defineRoom(gameServer, GameConst.ROOM_GAME, RoomGame, props, globalMessageActions);
        Logger.info('Loaded game room using stored configuration.');
        // define extra rooms (if any, for example features rooms):
        if(this.defineExtraRooms){
            for(let roomData of this.defineExtraRooms){
                await this.defineRoom(gameServer, roomData.roomName, roomData.room, props, globalMessageActions);
                counter++;
                Logger.info(`Loaded extra room: ${roomData.roomName}`);
            }
        }
        // load rooms data:
        let rooms = await this.loadRooms();
        // register room-scenes from database:
        for(let roomModel of rooms){
            let roomClass = RoomScene;
            if(roomModel.roomClassKey){
                let roomClassDefinition = props.config.get('server/customClasses/rooms/'+roomModel.room_class_key);
                if(!roomClassDefinition){
                    Logger.error([
                        'RoomsManager custom class not found.',
                        '- Room ID:', roomModel.id,
                        '- Custom class:', roomModel.room_class_key
                    ]);
                    continue;
                }
                roomClass = roomClassDefinition;
            }
            // define the room including all the props:
            await this.defineRoom(gameServer, roomModel.roomName, roomClass, props, globalMessageActions, roomModel);
            counter++;
            Logger.info(`Loaded room: ${roomModel.roomName}`);
        }
        // log defined rooms:
        Logger.info(`Total rooms loaded: ${counter}`);
        await this.events.emit('reldens.defineRoomsInGameServerDone', this);
        return this.definedRooms;
    }

    async defineRoom(gameServer, roomName, roomClass, props, globalMessageActions, roomModel = false)
    {
        let roomMessageActions = Object.assign({}, globalMessageActions);
        // run message actions event for each room:
        await this.events.emit('reldens.roomsMessageActionsByRoom', roomMessageActions, roomName);
        // merge room data and props:
        let roomProps = {
            loginManager: props.loginManager,
            config: props.config,
            messageActions: roomMessageActions,
            events: this.events,
            roomsManager: this
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
        if(!this.loadedRooms){
            // get rooms:
            let roomsModels = await RoomsModel.loadFullData();
            if(!roomsModels){
                ErrorManager.error('None rooms found in the database. A room is required to run.');
            }
            let rooms = [];
            let roomsById = {};
            let roomsByName = {};
            for(let room of roomsModels){
                let temp = this.generateRoomModel(room);
                rooms.push(temp);
                roomsById[room.id] = temp;
                roomsByName[room.name] = temp;
            }
            this.loadedRooms = rooms;
            this.loadedRoomsById = roomsById;
            this.loadedRoomsByName = roomsByName;
        }
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
        property = property.charAt(0).toUpperCase()+property.slice(1);
        let managerProperty = 'loadedRoomsBy'+property;
        if(this[managerProperty][value]){
            return this[managerProperty][value];
        }
        let loadByMethodName = 'loadBy'+property;
        let room = await RoomsModel[loadByMethodName](value);
        if(room){
            let temp = this.generateRoomModel(room);
            this.loadedRooms.push(temp);
            this.loadedRoomsById[room.id] = temp;
            this.loadedRoomsByName[room.name] = temp;
            return temp;
        }
        return false;
    }

    generateRoomModel(room)
    {
        let temp = {
            roomId: room.id,
            roomName: room.name,
            roomTitle: room.title,
            roomMap: room.map_filename,
            sceneImages: room.scene_images,
            changePoints: [],
            returnPoints: [],
            roomClassPath: room.room_class_key,
            returnPointDefault: false
        };
        // assign to room:
        for(let changePoint of room.rooms_change_points){
            temp.changePoints.push({i: changePoint.tile_index, n: changePoint.next_room.name});
        }
        // assign to room:
        for(let returnPosition of room.rooms_return_points){
            // this array translates to D for direction, X and Y for positions, De for default and P for previous room.
            let toRoomName = returnPosition.from_room ? returnPosition.from_room.name : false;
            let posTemp = {D: returnPosition.direction, X: returnPosition.x, Y: returnPosition.y, P: toRoomName};
            if(sc.hasOwn(returnPosition, 'is_default') && returnPosition.is_default){
                posTemp.De = returnPosition.is_default;
                temp.returnPointDefault = posTemp;
            }
            temp.returnPoints.push(posTemp);
        }
        if(!temp.returnPoints.length){
            Logger.error(['None return points found for room:', temp.roomName, temp.roomId]);
        }
        if(!temp.returnPointDefault){
            temp.returnPointDefault = temp.returnPoints[0];
        }
        return temp;
    }

}

module.exports.RoomsManager = RoomsManager;
