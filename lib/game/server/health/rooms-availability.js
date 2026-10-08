/**
 *
 * Reldens - RoomsAvailability
 *
 * Tells if a room can be entered. With the blocking disabled every room is available and no other server is requested.
 * A room of this server can be entered when it is already created or when this server is not blocking, since a
 * blocking server does not create scene rooms. A room of another server (its server URL in the client/rooms/servers
 * configuration) can be entered when that server answers its status and it is not blocking, since a blocking server
 * rejects the players that arrive. A not available room returns the reason as a client snippet key
 * (GameConst.ROOM_UNAVAILABLE). It also lists the status of every server for the administration.
 *
 */

const { GameConst } = require('../../constants');
const { sc } = require('@reldens/utils');

/**
 * @typedef {import('./server-health-monitor').ServerHealthMonitor} ServerHealthMonitor
 * @typedef {import('./remote-servers-status').RemoteServersStatus} RemoteServersStatus
 * @typedef {import('./remote-servers-status').ServerStatus} ServerStatus
 *
 * @typedef {Object} RoomsAvailabilityProps
 * @property {ServerHealthMonitor} serverHealthMonitor
 * @property {RemoteServersStatus} remoteServersStatus
 * @property {function(string): boolean} isRoomCreated
 * @property {Object<string, string>} [roomsServers]
 * @property {Array<string>} [serverSelfUrls]
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
        /** @type {function(string): boolean} */
        this.isRoomCreated = props.isRoomCreated;
        /** @type {Object<string, string>} */
        this.roomsServers = sc.get(props, 'roomsServers', {});
        /** @type {Array<string>} */
        this.serverSelfUrls = sc.get(props, 'serverSelfUrls', []);
        /** @type {Array<string>} */
        this.remoteServersUrls = [];
        for(let roomName of Object.keys(this.roomsServers)){
            let serverUrl = this.roomsServers[roomName];
            if('' === serverUrl || -1 !== this.serverSelfUrls.indexOf(serverUrl)){
                continue;
            }
            if(-1 === this.remoteServersUrls.indexOf(serverUrl)){
                this.remoteServersUrls.push(serverUrl);
            }
        }
    }

    /**
     * @param {string} roomName
     * @returns {Promise<RoomAvailability>}
     */
    async fetchRoomAvailability(roomName)
    {
        if(!this.serverHealthMonitor.blockingEnabled){
            return {isAvailable: true, reason: ''};
        }
        let serverUrl = sc.get(this.roomsServers, roomName, '');
        if(-1 === this.remoteServersUrls.indexOf(serverUrl)){
            if(this.isRoomCreated(roomName) || !this.serverHealthMonitor.isBlocking){
                return {isAvailable: true, reason: ''};
            }
            return {isAvailable: false, reason: GameConst.ROOM_UNAVAILABLE.SERVER_BUSY};
        }
        let remoteStatus = await this.remoteServersStatus.fetchStatus(serverUrl);
        if(!remoteStatus.isReachable){
            return {isAvailable: false, reason: GameConst.ROOM_UNAVAILABLE.SERVER_UNREACHABLE};
        }
        if(remoteStatus.usageReport.isBlocking){
            return {isAvailable: false, reason: GameConst.ROOM_UNAVAILABLE.SERVER_BUSY};
        }
        return {isAvailable: true, reason: ''};
    }

    /**
     * @param {Array<string>} roomsNames
     * @returns {Promise<Object<string, RoomAvailability>>}
     */
    async fetchRoomsAvailability(roomsNames)
    {
        let roomsAvailability = {};
        let availabilityPromises = [];
        for(let roomName of roomsNames){
            availabilityPromises.push(this.fetchRoomAvailability(roomName).then((roomAvailability) => {
                roomsAvailability[roomName] = roomAvailability;
            }));
        }
        await Promise.all(availabilityPromises);
        return roomsAvailability;
    }

    /**
     * @returns {Promise<Array<ServerStatus>>}
     */
    async fetchServersStatuses()
    {
        let statusesPromises = [];
        for(let serverUrl of this.remoteServersUrls){
            statusesPromises.push(this.remoteServersStatus.fetchStatus(serverUrl));
        }
        return [
            {
                serverUrl: [...this.serverSelfUrls].shift() || '',
                isSelf: true,
                isReachable: true,
                latencyMs: 0,
                usageReport: this.serverHealthMonitor.usageReport,
                error: ''
            },
            ...await Promise.all(statusesPromises)
        ];
    }

}

module.exports.RoomsAvailability = RoomsAvailability;
