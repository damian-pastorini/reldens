/**
 *
 * Reldens - GameClient
 *
 */

const { Client } = require('colyseus.js');
const { RoomsConst } = require('../../rooms/constants');
const { GameConst } = require('../constants');
const { Logger } = require('@reldens/utils');

class GameClient
{

    constructor(serverUrl, config)
    {
        this.serverUrl = serverUrl;
        this.config = config;
        this.autoConnectServerGameRoom = this.config.getWithoutLogs(
            'client/rooms/autoConnectServerGameRoom',
            true
        );
        this.autoConnectServerFeatureRooms = this.config.getWithoutLogs(
            'client/rooms/autoConnectServerFeatureRooms',
            true
        );
        this.roomsUrls = {};
        this.roomClients = {};
        this.gameRoomsByServer = {};
        this.featuresByServerFlag = {};
        this.featuresRoomsByServer = {};
    }

    async joinOrCreate(roomName, options)
    {
        try {
            let client = this.roomClient(roomName);
            if(!client){
                Logger.error('Client not found for room name "'+roomName+'".');
                return false;
            }
            let roomUrl = this.roomsUrls[roomName];
            await this.connectToGlobalGameRoom(roomUrl, client, options);
            await this.connectToGlobalFeaturesRooms(roomUrl, client, options);
            return await client.joinOrCreate(roomName, options);
        } catch (error) {
            if(RoomsConst.ERRORS.CREATING_ROOM_AWAIT === error.message){
                await new Promise(resolve => setTimeout(resolve, 500));
                return await this.joinOrCreate(roomName, options);
            }
            Logger.error('Joining room error: '+error.message);
            return false;
        }
    }

    async connectToGlobalGameRoom(roomUrl, client, options)
    {
        if(!this.autoConnectServerGameRoom){
            return;
        }
        if(this.gameRoomsByServer[roomUrl]){
            return;
        }
        this.gameRoomsByServer[roomUrl] = await client.joinOrCreate(GameConst.ROOM_GAME, options);
    }

    async connectToGlobalFeaturesRooms(roomUrl, client, options)
    {
        if(!this.autoConnectServerFeatureRooms){
            return;
        }
        if(this.featuresByServerFlag[roomUrl]){
            return;
        }
        this.featuresByServerFlag[roomUrl] = true;
        let featuresRoomsNames = this.config.getWithoutLogs('client/rooms/featuresRoomsNames', []);
        if(0 < featuresRoomsNames.length){
            return;
        }
        this.featuresRoomsByServer[roomUrl] = {};
        for(let featureRoomName of featuresRoomsNames){
            this.featuresRoomsByServer[roomUrl][featureRoomName] = await client.joinOrCreate(featureRoomName, options);
        }
    }

    roomClient(roomName)
    {
        if(!this.roomClients[roomName]){
            this.roomsUrls[roomName] = this.config.getWithoutLogs('client/rooms/servers/'+roomName, this.serverUrl);
            this.roomClients[roomName] = new Client(
                this.roomsUrls[roomName]
            );
        }
        return this.roomClients[roomName];
    }

}

module.exports.GameClient = GameClient;
