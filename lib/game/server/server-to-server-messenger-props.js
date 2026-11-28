/**
 *
 * Reldens - ServerToServerMessengerProps
 *
 * Keeps the servers network values, read once from the config by the class that creates it when the server starts: the
 * signed tokens instance shared by every request between the servers, the rooms servers map, this server address (its
 * public URL, the address the other servers sign their requests for), every address of this server (its public and
 * base URLs) and the other servers addresses (the rooms servers that are not this server). The login flows, the rooms
 * availability and the features messengers (spread into their props with their own route) read them from this single
 * instance.
 *
 */

/**
 * @typedef {import('./expiring-hmac-token').ExpiringHmacToken} ExpiringHmacToken
 *
 * @typedef {Object} ServerToServerMessengerPropsData
 * @property {ExpiringHmacToken} expiringHmacToken
 * @property {Object<string, string>} roomsServers
 * @property {string} serverSelfAddress
 * @property {Array<string>} serverSelfAddresses
 * @property {Array<string>} otherServersUrls
 */
class ServerToServerMessengerProps
{

    /**
     * @param {ServerToServerMessengerPropsData} props
     */
    constructor(props)
    {
        /** @type {ExpiringHmacToken} */
        this.expiringHmacToken = props.expiringHmacToken;
        /** @type {Object<string, string>} the normalized server address of every room, parsed once */
        this.roomsServers = props.roomsServers;
        /** @type {string} */
        this.serverSelfAddress = props.serverSelfAddress;
        /** @type {Array<string>} */
        this.serverSelfAddresses = props.serverSelfAddresses;
        /** @type {Array<string>} */
        this.otherServersUrls = props.otherServersUrls;
    }

}

module.exports.ServerToServerMessengerProps = ServerToServerMessengerProps;
