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
        this.lastErrorMessage = '';
    }

    async joinOrCreate(roomName, options)
    {
        this.lastErrorMessage = '';
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
            this.lastErrorMessage = error.message;
            // any connection errors will be handled in the higher level class
            Logger.error('Joining room error: '+error.message);
        }
        return false;
    }

    async connectToGlobalGameRoom(roomUrl, client, options)
    {
        if(!this.autoConnectServerGameRoom){
            return;
        }
        if('' === roomUrl || this.serverUrl === roomUrl){
            Logger.debug('Avoid connect to global game room.', this.serverUrl, roomUrl);
            return;
        }
        if(this.gameRoomsByServer[roomUrl]){
            return;
        }
        Logger.debug('Registering GameRoom for server: '+roomUrl);
        this.gameRoomsByServer[roomUrl] = await client.joinOrCreate(GameConst.ROOM_GAME, options);
        // required to avoid unregistered messages warning:
        this.gameRoomsByServer[roomUrl].onMessage('*', () => {});
    }

    async connectToGlobalFeaturesRooms(roomUrl, client, options)
    {
        if(!this.autoConnectServerFeatureRooms){
            return;
        }
        if('' === roomUrl || this.serverUrl === roomUrl){
            Logger.debug('Avoid connect to features rooms.', this.serverUrl, roomUrl);
            return;
        }
        if(this.featuresByServerFlag[roomUrl]){
            return;
        }
        Logger.debug('Registering features rooms for server: '+roomUrl);
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
            Logger.debug('Creating client with URL "'+this.roomsUrls[roomName]+'" for room "'+roomName+'".');
            this.roomClients[roomName] = new Client(
                this.roomsUrls[roomName]
            );
        }
        return this.roomClients[roomName];
    }

}

module.exports.GameClient = GameClient;
