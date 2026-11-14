/**
 *
 * Reldens - RequiredSdkReachabilityCheck
 *
 * Checks on the server start that the SDK of every enabled ads provider answers, for the games that require the ads SDK
 * (client/ads/general/sdkRequired on): an SDK URL that fails or does not answer within the timeout stops the server
 * start. A relative SDK URL, or an absolute one under this server public or base URL, is served by this same server,
 * which is not listening yet, so it is not checked.
 *
 */

const { AdsConst } = require('../constants');
const { ServerUrlMatcher } = require('../../game/server-url-matcher');
const { Logger, sc } = require('@reldens/utils');

class RequiredSdkReachabilityCheck
{

    /**
     * @param {Object} props
     */
    constructor(props)
    {
        /** @type {number} */
        this.timeoutMs = sc.get(props, 'timeoutMs', AdsConst.SDK_CHECK_TIMEOUT);
        /** @type {function(string, Object): Promise<Response>} */
        this.fetchRequest = sc.get(props, 'fetchRequest', (url, options) => fetch(url, options));
        /** @type {Array<string>} */
        this.serverUrls = sc.get(props, 'serverUrls', []);
    }

    /**
     * @param {Object<string, Object>} providers
     * @returns {Promise<boolean>}
     */
    async areProvidersSdkReachable(providers)
    {
        for(let providerKey of Object.keys(providers)){
            let sdkUrl = String(sc.get(providers[providerKey], 'sdkUrl', ''));
            if(!providers[providerKey].enabled || !URL.canParse(sdkUrl) || this.isServedByThisServer(sdkUrl)){
                continue;
            }
            if(!await this.isReachable(sdkUrl)){
                Logger.critical('Required ads SDK not reachable, the server will not start: '+providerKey+' '+sdkUrl);
                return false;
            }
        }
        return true;
    }

    /**
     * @param {string} sdkUrl
     * @returns {boolean}
     */
    isServedByThisServer(sdkUrl)
    {
        return this.serverUrls.some(
            serverUrl => URL.canParse(serverUrl)
                && ServerUrlMatcher.fetchServerAddress(sdkUrl).startsWith(
                    ServerUrlMatcher.fetchServerAddress(serverUrl)+'/'
                )
        );
    }

    /**
     * @param {string} sdkUrl
     * @returns {Promise<boolean>}
     */
    async isReachable(sdkUrl)
    {
        try {
            return (await this.fetchRequest(sdkUrl, {signal: AbortSignal.timeout(this.timeoutMs)})).ok;
        } catch(error) {
            Logger.error('Ads SDK request failed: '+sdkUrl, error.message);
            return false;
        }
    }

}

module.exports.RequiredSdkReachabilityCheck = RequiredSdkReachabilityCheck;
