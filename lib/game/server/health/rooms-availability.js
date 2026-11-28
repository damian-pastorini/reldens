/**
 *
 * Reldens - RoomsAvailability
 *
 * Tells if a room can be entered. With the blocking disabled every room is available and no other server is requested.
 * A room of this server can be entered when it is already created or when this server is not blocking, since a
 * blocking server does not create scene rooms. A room of another server (its server URL in the client/rooms/servers
 * configuration) can be entered when that server answers its status and it is not blocking, since a blocking server
 * rejects the players that arrive. A not available room returns the reason as a client snippet key
 * (GameConst.ROOM_UNAVAILABLE). It also lists the status of every server for the administration, and the rooms usage
 * summaries of the other reachable servers (their logged users keys and players per room) for the administration
 * counts: a user logged on several servers (like on the login server and on the server of its scene, with
 * server/players/disconnectUsersOnServerChange disabled) is counted once by its key. The availability of several rooms
 * requests the status of each of their servers once (RemoteServersStatus.fetchStatuses).
 *
 */

const { GameConst } = require('../../constants');
const { sc } = require('@reldens/utils');

/**
 * @typedef {import('./server-health-monitor').ServerHealthMonitor} ServerHealthMonitor
 * @typedef {import('./remote-servers-status').RemoteServersStatus} RemoteServersStatus
 * @typedef {import('./remote-servers-status').ServerStatus} ServerStatus
 * @typedef {import('./rooms-usage-collector').RoomsUsageCollector} RoomsUsageCollector
 * @typedef {import('../server-to-server-messenger-props').ServerToServerMessengerProps} ServerToServerMessengerProps
 *
 * @typedef {Object} RoomsAvailabilityProps
 * @property {ServerHealthMonitor} serverHealthMonitor
 * @property {RemoteServersStatus} remoteServersStatus
 * @property {RoomsUsageCollector} roomsUsageCollector
 * @property {function(string): boolean} isRoomCreated
 * @property {ServerToServerMessengerProps} serverToServerMessengerProps
 *
 * @typedef {Object} RoomAvailability
 * @property {boolean} isAvailable
 * @property {string} reason
 */
class RoomsAvailability
{

    /**
     * @param {RoomsAvailabilityProps} props
     */
    constructor(props)
    {
        /** @type {ServerHealthMonitor} */
        this.serverHealthMonitor = props.serverHealthMonitor;
        /** @type {RemoteServersStatus} */
        this.remoteServersStatus = props.remoteServersStatus;
        /** @type {RoomsUsageCollector} */
        this.roomsUsageCollector = props.roomsUsageCollector;
        /** @type {function(string): boolean} */
        this.isRoomCreated = props.isRoomCreated;
        /** @type {Object<string, string>} */
        this.roomsServers = props.serverToServerMessengerProps.roomsServers;
        /** @type {Array<string>} */
        this.remoteServersUrls = props.serverToServerMessengerProps.otherServersUrls;
        /** @type {string} */
        this.serverSelfAddress = props.serverToServerMessengerProps.serverSelfAddress;
    }

    /**
     * @param {string} roomName
     * @returns {Promise<RoomAvailability>}
     */
    async fetchRoomAvailability(roomName)
    {
        return this.roomAvailability(
            roomName,
            await this.remoteServersStatus.fetchStatuses(this.fetchRoomsRemoteServersUrls([roomName], {}))
        );
    }

    /**
     * @param {Array<string>} roomsNames
     * @param {Object<string, RoomAvailability>} [knownRoomsAvailability]
     * @returns {Promise<Object<string, RoomAvailability>>}
     */
    async fetchRoomsAvailability(roomsNames, knownRoomsAvailability = {})
    {
        let statusesByServer = await this.remoteServersStatus.fetchStatuses(
            this.fetchRoomsRemoteServersUrls(roomsNames, knownRoomsAvailability)
        );
        for(let roomName of roomsNames){
            if(roomName && !sc.hasOwn(knownRoomsAvailability, roomName)){
                knownRoomsAvailability[roomName] = this.roomAvailability(roomName, statusesByServer);
            }
        }
        return knownRoomsAvailability;
    }

    /**
     * @param {Array<string>} roomsNames
     * @param {Object<string, RoomAvailability>} knownRoomsAvailability
     * @returns {Array<string>}
     */
    fetchRoomsRemoteServersUrls(roomsNames, knownRoomsAvailability)
    {
        let roomsRemoteServersUrls = [];
        for(let roomName of roomsNames){
            let serverUrl = sc.get(this.roomsServers, roomName, '');
            if(
                this.serverHealthMonitor.blockingEnabled
                && !sc.hasOwn(knownRoomsAvailability, roomName)
                && -1 !== this.remoteServersUrls.indexOf(serverUrl)
                && -1 === roomsRemoteServersUrls.indexOf(serverUrl)
            ){
                roomsRemoteServersUrls.push(serverUrl);
            }
        }
        return roomsRemoteServersUrls;
    }

    /**
     * @param {string} roomName
     * @param {Object<string, ServerStatus>} statusesByServer
     * @returns {RoomAvailability}
     */
    roomAvailability(roomName, statusesByServer)
    {
        let remoteStatus = sc.get(statusesByServer, sc.get(this.roomsServers, roomName, ''), false);
        let reason = '';
        if(
            !remoteStatus
            && this.serverHealthMonitor.blockingEnabled
            && this.serverHealthMonitor.isBlocking
            && !this.isRoomCreated(roomName)
        ){
            reason = GameConst.ROOM_UNAVAILABLE.SERVER_BUSY;
        }
        if(remoteStatus && !remoteStatus.isReachable){
            reason = GameConst.ROOM_UNAVAILABLE.SERVER_UNREACHABLE;
        }
        if(remoteStatus?.isReachable && remoteStatus.usageReport.isBlocking){
            reason = GameConst.ROOM_UNAVAILABLE.SERVER_BUSY;
        }
        return {isAvailable: '' === reason, reason};
    }

    /**
     * @returns {Promise<Array<ServerStatus>>}
     */
    async fetchServersStatuses()
    {
        return [
            {
                serverUrl: this.serverSelfAddress,
                isSelf: true,
                isReachable: true,
                latencyMs: 0,
                usageReport: this.serverHealthMonitor.usageReport,
                error: ''
            },
            ...Object.values(await this.remoteServersStatus.fetchStatuses(this.remoteServersUrls))
        ];
    }

    /**
     * @returns {Promise<Array<Object>>}
     */
    async fetchOtherServersRoomsUsage()
    {
        let roomsUsageList = [];
        for(let serverStatus of Object.values(await this.remoteServersStatus.fetchStatuses(this.remoteServersUrls))){
            let roomsUsage = sc.get(serverStatus.usageReport, 'roomsUsage', false);
            if(serverStatus.isReachable && roomsUsage){
                roomsUsageList.push(roomsUsage);
            }
        }
        return roomsUsageList;
    }

    /**
     * @param {number} storedRoomId
     * @returns {Promise<number>}
     */
    async countOtherServersRoomPlayers(storedRoomId)
    {
        let playersCount = 0;
        for(let roomsUsage of await this.fetchOtherServersRoomsUsage()){
            let roomPlayersCount = sc.get(sc.get(roomsUsage, 'playersByStoredRoomId', {}), storedRoomId, 0);
            playersCount += sc.isNumber(roomPlayersCount) ? roomPlayersCount : 0;
        }
        return playersCount;
    }

    /**
     * @returns {Promise<number>}
     */
    async countActiveUsers()
    {
        let activeUsersKeys = {};
        this.addUsersKeys(activeUsersKeys, this.roomsUsageCollector.fetchActiveUsersKeys());
        for(let roomsUsage of await this.fetchOtherServersRoomsUsage()){
            this.addUsersKeys(activeUsersKeys, sc.get(roomsUsage, 'activeUsersKeys', []));
        }
        return Object.keys(activeUsersKeys).length;
    }

    /**
     * @param {Object<string, boolean>} activeUsersKeys
     * @param {Array<string>} serverUsersKeys
     * @returns {boolean}
     */
    addUsersKeys(activeUsersKeys, serverUsersKeys)
    {
        if(!sc.isArray(serverUsersKeys)){
            return false;
        }
        for(let userKey of serverUsersKeys){
            if(sc.isString(userKey)){
                activeUsersKeys[userKey] = true;
            }
        }
        return true;
    }

}

module.exports.RoomsAvailability = RoomsAvailability;
