/**
 *
 * Reldens - RoomsManager
 *
 * This class will load the rooms information and define them in the server.
 *
 */

const Rooms = require('./model');
const configuredClasses = require('./rooms-classes');
const { GameConst } = require('../../game/constants');

class RoomsManager
{

    constructor(options)
    {
        if(options.hasOwnProperty('defineRooms')){
            this.defineRooms = options.defineRooms;
        } else {
            this.defineRooms = false;
            console.log('INFO - None extra rooms to be defined.');
        }
        if(options.hasOwnProperty('messageActions')){
            this.messageActions = options.messageActions;
        } else {
            this.messageActions = false;
            console.log('INFO - None additional message actions to be defined.');
        }
        this.configuredClasses = configuredClasses;
    }

    async defineRoomsInGameServer(gameServer, props)
    {
        // loaded rooms counter:
        let counter = 0;
        // lobby room:
        gameServer.define(GameConst.ROOM_GAME, this.configuredClasses['RoomGame'], props);
        console.log('INFO - Loaded game room using stored configuration.');
        // define extra rooms (if any, for example features rooms):
        if(this.defineRooms){
            for(let roomData of this.defineRooms){
                gameServer.define(roomData.roomName, roomData.room, props);
                counter++;
                console.log(`INFO - Loaded extra room: ${roomData.roomName}`);
            }
        }
        // load rooms data:
        let rooms = await this.loadRooms();
        // register room-scenes from database:
        for(let room of rooms){
            // merge room data and props:
            let roomProps = {
                roomData: room,
                loginManager: props.loginManager,
                config: props.config,
                messageActions: this.messageActions
            };
            let roomClass = this.configuredClasses['RoomScene'];
            if(room.roomClass && this.configuredClasses.hasOwnProperty(room.roomClass)){
                roomClass = this.configuredClasses[room.roomClass];
            }
            // define the room including all the props:
            gameServer.define(room.roomName, roomClass, roomProps);
            counter++;
            console.log(`INFO - Loaded room: ${room.roomName}`);
        }
        // log defined rooms:
        console.log(`INFO - Total rooms loaded: ${counter}`);
        return rooms;
    }

    async loadRooms()
    {
        // get rooms:
        let roomsModels = await Rooms.query().eager('[rooms_change_points.next_room, rooms_return_points.to_room]');
        if(!roomsModels){
            throw new Error('ERROR - None rooms found in the database. A room is required to run.');
        }
        let rooms = [];
        for (let room of roomsModels){
            let temp = this.generateRoomModel(room);
            rooms.push(temp);
        }
        return rooms;
    }

    async loadRoomById(roomId)
    {
        let room = await Rooms.query()
            .eager('[rooms_change_points.next_room, rooms_return_points.to_room]')
            .findById(roomId);
        return this.generateRoomModel(room);
    }

    async loadRoomByName(roomName)
    {
        let room = await Rooms.query()
            .eager('[rooms_change_points.next_room, rooms_return_points.to_room]')
            .where('name', roomName)
            .first();
        return this.generateRoomModel(room);
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
            roomClass: room.room_class
        };
        // assign to room:
        for (let changePoint of room.rooms_change_points){
            temp.changePoints.push({i: changePoint.tile_index, n: changePoint.next_room.name});
        }
        // assign to room:
        for (let returnPosition of room.rooms_return_points){
            // this array translates to D for direction, X and Y for positions, De for default and P for previous room.
            let toRoomName = returnPosition.to_room ? returnPosition.to_room.name : false;
            let posTemp = {D: returnPosition.direction, X: returnPosition.x, Y: returnPosition.y, P: toRoomName};
            if(returnPosition.hasOwnProperty('is_default') && returnPosition.is_default){
                posTemp.De = returnPosition.is_default;
            }
            temp.returnPoints.push(posTemp);
        }
        return temp;
    }

}

module.exports = RoomsManager;
