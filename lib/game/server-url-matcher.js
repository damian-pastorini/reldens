/**
 *
 * Reldens - ServerUrlMatcher
 *
 * Checks if a server URL points to the current server by its origin and path, after mapping the ws and wss schemes to
 * http and https (the client game server URL uses ws or wss while the rooms servers URLs use http or https), so the
 * default ports 80 and 443 are kept apart, and without the path trailing slashes, so "https://example.com/game/" is the
 * same server as "https://example.com/game". An empty server URL is the current server, a not valid URL has an empty
 * address and is never the current server, and the servers addresses lists skip the not valid and the excluded ones,
 * so no caller validates the URLs itself.
 *
 */

const { GameConst } = require('./constants');
const { Logger, sc } = require('@reldens/utils');

class ServerUrlMatcher
{

    /**
     * @param {string} serverUrl
     * @param {string} currentServerUrl
     * @returns {boolean}
     */
    static isCurrentServer(serverUrl, currentServerUrl)
    {
        if(!serverUrl){
            return true;
        }
        let serverAddress = this.fetchServerAddress(serverUrl);
        return '' !== serverAddress && serverAddress === this.fetchServerAddress(currentServerUrl);
    }

    /**
     * @param {string} serverUrl
     * @returns {string}
     */
    static fetchServerAddress(serverUrl)
    {
        let parsedUrl = false;
        try {
            parsedUrl = new URL(serverUrl);
        } catch (error) {
            Logger.debug('Invalid server URL.', serverUrl, error.message);
            return '';
        }
        parsedUrl.protocol = sc.get(
            GameConst.HTTP_PROTOCOLS_BY_WEB_SOCKET_PROTOCOL,
            parsedUrl.protocol,
            parsedUrl.protocol
        );
        return parsedUrl.origin+parsedUrl.pathname.replace(/\/+$/, '');
    }

    /**
     * @param {Object<string, string>} serversUrls
     * @returns {Object<string, string>}
     */
    static mapServersAddresses(serversUrls)
    {
        let serversAddresses = {};
        for(let serverKey of Object.keys(serversUrls)){
            let serverAddress = this.fetchServerAddress(serversUrls[serverKey]);
            if('' !== serverAddress){
                serversAddresses[serverKey] = serverAddress;
            }
        }
        return serversAddresses;
    }

    /**
     * @param {Array<string>|Object<string, string>} serversUrls
     * @param {Array<string>} [excludedAddresses]
     * @returns {Array<string>}
     */
    static fetchServersAddresses(serversUrls, excludedAddresses = [])
    {
        let serversAddresses = [];
        for(let serverKey of Object.keys(serversUrls)){
            let serverAddress = this.fetchServerAddress(serversUrls[serverKey]);
            if(
                '' !== serverAddress
                && -1 === excludedAddresses.indexOf(serverAddress)
                && -1 === serversAddresses.indexOf(serverAddress)
            ){
                serversAddresses.push(serverAddress);
            }
        }
        return serversAddresses;
    }

}

module.exports.ServerUrlMatcher = ServerUrlMatcher;
