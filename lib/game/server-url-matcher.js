/**
 *
 * Reldens - ServerUrlMatcher
 *
 * Checks if two URLs point to the same server by their host and path, so a server is matched with any scheme (the
 * client game server URL uses ws or wss while the rooms servers URLs use http or https).
 *
 */

class ServerUrlMatcher
{

    /**
     * @param {string} firstUrl
     * @param {string} secondUrl
     * @returns {boolean}
     */
    static isSameServer(firstUrl, secondUrl)
    {
        let firstServerUrl = new URL(firstUrl);
        let secondServerUrl = new URL(secondUrl);
        if(firstServerUrl.host !== secondServerUrl.host){
            return false;
        }
        return firstServerUrl.pathname === secondServerUrl.pathname;
    }

}

module.exports.ServerUrlMatcher = ServerUrlMatcher;
