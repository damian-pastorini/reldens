/**
 *
 * Reldens - ServerUrlMatcher
 *
 * Checks if a server URL points to the current server by its origin and path, after mapping the ws and wss schemes to
 * http and https (the client game server URL uses ws or wss while the rooms servers URLs use http or https), so the
 * default ports 80 and 443 are kept apart. An empty server URL is the current server.
 *
 */

const { GameConst } = require('./constants');
const { sc } = require('@reldens/utils');

class ServerUrlMatcher
{

    /**
     * @param {string} serverUrl
     * @param {string} currentServerUrl
     * @returns {boolean}
     */
    static isCurrentServer(serverUrl, currentServerUrl)
    {
        if('' === serverUrl){
            return true;
        }
        return this.fetchServerAddress(serverUrl) === this.fetchServerAddress(currentServerUrl);
    }

    /**
     * @param {string} serverUrl
     * @returns {string}
     */
    static fetchServerAddress(serverUrl)
    {
        let parsedUrl = new URL(serverUrl);
        parsedUrl.protocol = sc.get(
            GameConst.HTTP_PROTOCOLS_BY_WEB_SOCKET_PROTOCOL,
            parsedUrl.protocol,
            parsedUrl.protocol
        );
        return parsedUrl.origin+parsedUrl.pathname;
    }

}

module.exports.ServerUrlMatcher = ServerUrlMatcher;
