/**
 *
 * Reldens - GameClient
 *
 * Manages Colyseus WebSocket client connections for multiplayer rooms. Handles multiserver
 * support, automatic connection to global game rooms and feature rooms, client instance creation
 * per room, and retry logic for room creation. Coordinates with ConfigManager for server URLs
 * and room assignments. Tracks joined rooms across multiple servers. A room on the login server is joined on the
 * client game server URL, so the page host alias never makes its own server look like another one.
 *
 */

const { SyncClientDriver } = require('../../sync/client/colyseus/sync-client-driver');
const { Client } = SyncClientDriver;
const { RoomsConst } = require('../../rooms/constants');
const { GameConst } = require('../constants');
const { ServerUrlMatcher } = require('../server-url-matcher');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('colyseus.js').Room} Room
 * @typedef {import('colyseus.js').Client} Client
 * @typedef {import('../../config/client/manager').ConfigManager} ConfigManager
 * @typedef {object} JoinOptions
 * @property {string} selectedPlayer
 * @property {string} token
 */
class GameClient
{

    /**
     * @param {string} serverUrl
     * @param {ConfigManager} config
     */
    constructor(serverUrl, config)
    {
        /** @type {string} */
        this.serverUrl = serverUrl;
        /** @type {ConfigManager} */
        this.config = config;
        /** @type {function(Room, string): Promise<void>|boolean} */
        this.onFeatureRoomJoined = false;
        /** @type {boolean} */
        this.autoConnectServerGameRoom = this.config.getWithoutLogs(
            'client/rooms/autoConnectServerGameRoom',
            true
        );
        /** @type {boolean} */
        this.autoConnectServerFeatureRooms = this.config.getWithoutLogs(
            'client/rooms/autoConnectServerFeatureRooms',
            true
        );
        /** @type {Object<string, string>} */
        this.roomsUrls = {};
        /** @type {Object<string, Client>} */
        this.roomClients = {};
        /** @type {Object<string, Room>} */
        this.gameRoomsByServer = {};
        /** @type {Object<string, Object<string, Room>>} */
        this.featuresRoomsByServer = {};
        /** @type {string} */
        this.lastErrorMessage = '';
    }

    /**
     * @param {string} roomName
     * @param {JoinOptions} options
     * @returns {Promise<Room|boolean>}
     */
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
                await new Promise(resolve => setTimeout(resolve, GameConst.ROOM_CREATE_RETRY_DELAY_MS));
                return await this.joinOrCreate(roomName, options);
            }
            this.lastErrorMessage = sc.get(error, 'message', '');
            if('' === this.lastErrorMessage){
                this.lastErrorMessage = GameConst.JOIN_GAME_ERROR_MESSAGE;
            }
            // any connection errors will be handled in the higher level class
            Logger.error('Joining room error: '+error.message);
        }
        return false;
    }

    /**
     * @param {string} roomUrl
     * @param {Client} client
     * @param {JoinOptions} options
     * @returns {Promise<void>}
     */
    async connectToGlobalGameRoom(roomUrl, client, options)
    {
        if(!this.autoConnectServerGameRoom){
            return;
        }
        if(ServerUrlMatcher.isCurrentServer(roomUrl, this.serverUrl)){
            Logger.debug('Avoid connect to global game room.', this.serverUrl, roomUrl);
            return;
        }
        if(this.gameRoomsByServer[roomUrl]?.connection?.isOpen){
            return;
        }
        Logger.debug('Registering GameRoom for server: '+roomUrl);
        this.gameRoomsByServer[roomUrl] = await client.joinOrCreate(GameConst.ROOM_GAME, options);
        // required to avoid unregistered messages warning:
        this.gameRoomsByServer[roomUrl].onMessage('*', () => {
            return false;
        });
    }

    /**
     * @param {string} roomUrl
     * @param {Client} client
     * @param {JoinOptions} options
     * @returns {Promise<void>}
     */
    async connectToGlobalFeaturesRooms(roomUrl, client, options)
    {
        if(!this.autoConnectServerFeatureRooms){
            return;
        }
        if(ServerUrlMatcher.isCurrentServer(roomUrl, this.serverUrl)){
            Logger.debug('Avoid connect to features rooms.', this.serverUrl, roomUrl);
            return;
        }
        Logger.debug('Registering features rooms for server: '+roomUrl);
        let featuresRoomsNames = this.config.getWithoutLogs('client/rooms/featuresRoomsNames', []);
        if(!this.featuresRoomsByServer[roomUrl]){
            this.featuresRoomsByServer[roomUrl] = {};
        }
        for(let featureRoomName of featuresRoomsNames){
            if(this.featuresRoomsByServer[roomUrl][featureRoomName]?.connection?.isOpen){
                continue;
            }
            let featureRoom = await client.joinOrCreate(featureRoomName, options);
            this.featuresRoomsByServer[roomUrl][featureRoomName] = featureRoom;
            if(this.onFeatureRoomJoined){
                await this.onFeatureRoomJoined(featureRoom, featureRoomName);
            }
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async leaveServersRooms()
    {
        await this.leaveRooms(this.gameRoomsByServer);
        for(let roomUrl of Object.keys(this.featuresRoomsByServer)){
            await this.leaveRooms(this.featuresRoomsByServer[roomUrl]);
        }
        this.gameRoomsByServer = {};
        this.featuresRoomsByServer = {};
    }

    /**
     * @param {Object<string, Room>} roomsList
     * @returns {Promise<void>}
     */
    async leaveRooms(roomsList)
    {
        for(let roomKey of Object.keys(roomsList)){
            await roomsList[roomKey].leave();
        }
    }

    /**
     * @param {string} sceneRoomName
     * @param {string} featureRoomName
     * @param {Object<string, Room>} joinedRooms
     * @returns {Room|boolean}
     */
    serverFeatureRoom(sceneRoomName, featureRoomName, joinedRooms)
    {
        let otherServerRoom = sc.get(
            sc.get(this.featuresRoomsByServer, sc.get(this.roomsUrls, sceneRoomName, ''), {}),
            featureRoomName,
            false
        );
        if(otherServerRoom?.connection?.isOpen){
            return otherServerRoom;
        }
        return sc.get(joinedRooms, featureRoomName, false);
    }

    /**
     * @param {string} roomName
     * @returns {Client}
     */
    roomClient(roomName)
    {
        if(!this.roomClients[roomName]){
            this.roomsUrls[roomName] = this.fetchRoomServerUrl(roomName);
            Logger.debug('Creating client with URL "'+this.roomsUrls[roomName]+'" for room "'+roomName+'".');
            this.roomClients[roomName] = new Client(
                this.roomsUrls[roomName]
            );
        }
        return this.roomClients[roomName];
    }

    /**
     * @param {string} roomName
     * @returns {string}
     */
    fetchRoomServerUrl(roomName)
    {
        let roomServerUrl = this.config.getWithoutLogs('client/rooms/servers/'+roomName, this.serverUrl);
        return ServerUrlMatcher.isCurrentServer(roomServerUrl, this.config.getWithoutLogs('client/rooms/loginServerUrl', ''))
            ? this.serverUrl
            : roomServerUrl;
    }

}

module.exports.GameClient = GameClient;
