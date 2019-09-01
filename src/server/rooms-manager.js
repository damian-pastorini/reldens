/**
 *
 * Reldens - RoomsManager
 *
 * This class will load the rooms information and define them in the server.
 *
 */

const RoomGame = require('./room-game');
const RoomScene = require('./room-scene');
// @TODO: move chat to features.
// const RoomChat = require('../chat/room-chat');
const share = require('../utils/constants');

class RoomsManager
{

    constructor(options = false)
    {
        if(options && options.hasOwnProperty('dataServer')){
            this.dataServer = options.dataServer;
        } else {
            throw new Error('Missing dataServer.');
        }
    }

    async defineRoomsInGameServe(gameServer, config)
    {
        // lobby room:
        gameServer.define(share.ROOM_GAME, RoomGame, {dataServer: this.dataServer, config: config});
        console.log('INFO - Loaded game room using configuration.', config);
        // @TODO: move chat to features.
        // register global chat room:
        // gameServer.define(share.CHAT_GLOBAL, RoomChat, {dataServer: this.dataServer, config: config});
        // console.log('INFO - Loaded chat room.');
        // load rooms data:
        let rooms = await this.loadRooms();
        // register the rooms in the server:
        let counter = 0;
        // @NOTE: we only need to send the basic data to the client and do all the associations on the client side.
        // register room-scenes from database:
        for(let room of rooms){
            let temp = {
                roomId: room.id,
                roomName: room.name,
                roomTitle: room.title,
                roomMap: room.map_filename,
                roomImages: room.scene_images,
                changePoints: room.change_points,
                returnPoints: room.return_points
            };
            gameServer.define(room.name, RoomScene, {room: temp, dataServer: this.dataServer, config: config});
            console.log('INFO - Loaded room: '+temp.roomName);
            counter++;
        }
        // log defined rooms:
        console.log(`INFO - Loaded ${counter} rooms`);
        return rooms;
    }

    async loadRooms()
    {
        // get rooms:
        let roomsQuery = 'SELECT * FROM rooms';
        let rooms = await this.dataServer.query(roomsQuery);
        if(!rooms){
            throw new Error('ERROR - None rooms found in the database.');
        }
        for (let room of rooms){
            // load change points:
            room.change_points = [];
            let changePointsQuery = 'SELECT cp.tile_index AS tileIndex, s.name AS nextRoomName'+
                ' FROM rooms_change_points AS cp'+
                ' LEFT JOIN rooms AS s'+
                ' ON s.id = cp.next_room_id'+
                ' WHERE cp.room_id = ?';
            let changePoints = await this.dataServer.query(changePointsQuery, room.id);
            // assign to room:
            for (let changePoint of changePoints){
                room.change_points.push({i: changePoint.tileIndex, n: changePoint.nextRoomName});
            }
            // load return points:
            room.return_points = [];
            let returnPointsQuery = 'SELECT rp.direction AS D, rp.X, rp.Y, rp.is_default AS De, r.name AS P'+
                ' FROM rooms_return_points AS rp'+
                ' LEFT JOIN rooms AS r ON rp.to_room_id = r.id'+
                ' WHERE rp.room_id = ?;';
            let returnPoints = await this.dataServer.query(returnPointsQuery, room.id);
            // assign to room:
            for (let returnPosition of returnPoints){
                // this array translates to D for direction, X and Y for positions, De for default and P for next room.
                let posTemp = {D: returnPosition.D, X: returnPosition.X, Y: returnPosition.Y, P: returnPosition.P};
                if(returnPosition.De){
                    posTemp.De = returnPosition.De;
                }
                room.return_points.push(posTemp);
            }
        }
        return rooms;
    }

}

module.exports = RoomsManager;