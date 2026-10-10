/**
 *
 * Reldens - RemoteServersStatus
 *
 * Requests the status of the other servers of a multi-server setup (the rooms with a different server URL) signed with
 * the shared signed tokens secret, and keeps each answer for the cache time so the scene changes and the logins do not
 * request it every time. A server that does not answer before the timeout, or that answers with an error, is not
 * reachable. The response time of every request is kept as latencyMs, a slow server that answers before the timeout
 * is still reachable.
 *
 */

const { GameConst } = require('../../constants');
const { HealthConst } = require('./constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../expiring-hmac-token').ExpiringHmacToken} ExpiringHmacToken
 *
 * @typedef {Object} RemoteServersStatusProps
 * @property {ExpiringHmacToken} expiringHmacToken
 * @property {number} [timeoutMs]
 * @property {number} [cacheMs]
 * @property {Function} [fetchCallback]
 *
 * @typedef {Object} ServerStatus
 * @property {string} serverUrl
 * @property {boolean} isSelf
 * @property {boolean} isReachable
 * @property {number} latencyMs
 * @property {Object|boolean} usageReport
 * @property {string} error
 */
class RemoteServersStatus
{

    /**
     * @param {RemoteServersStatusProps} props
     */
    constructor(props)
    {
        /** @type {ExpiringHmacToken} */
        this.expiringHmacToken = props.expiringHmacToken;
        /** @type {number} */
        this.timeoutMs = Number(sc.get(props, 'timeoutMs', HealthConst.DEFAULTS.REMOTE_STATUS_TIMEOUT_MS));
        /** @type {number} */
        this.cacheMs = Number(sc.get(props, 'cacheMs', HealthConst.DEFAULTS.CHECK_INTERVAL_MS));
        /** @type {Function} */
        this.fetchCallback = sc.get(props, 'fetchCallback', fetch);
        /** @type {Object<string, {requestedAt: number, statusPromise: Promise<ServerStatus>}>} */
        this.statusesByServer = {};
    }

    /**
     * @param {string} serverUrl
     * @returns {Promise<ServerStatus>}
     */
    async fetchStatus(serverUrl)
    {
        let cachedStatus = sc.get(this.statusesByServer, serverUrl, false);
        if(cachedStatus && Date.now() - cachedStatus.requestedAt < this.cacheMs){
            return await cachedStatus.statusPromise;
        }
        let statusPromise = this.requestStatus(serverUrl);
        this.statusesByServer[serverUrl] = {requestedAt: Date.now(), statusPromise};
        return await statusPromise;
    }

    /**
     * @param {string} serverUrl
     * @returns {Promise<ServerStatus>}
     */
    async requestStatus(serverUrl)
    {
        let status = {serverUrl, isSelf: false, isReachable: false, latencyMs: 0, usageReport: false, error: ''};
        let token = this.expiringHmacToken.generate(
            [HealthConst.STATUS_TOKEN_VALUE],
            Date.now()+GameConst.SIGNED_TOKENS.SERVER_STATUS_EXPIRATION
        );
        if(!token){
            status.error = 'Status token could not be generated, check the signed tokens secret.';
            Logger.error(status.error);
            return status;
        }
        let requestStartTime = Date.now();
        try {
            let response = await this.fetchCallback(
                serverUrl+GameConst.ROUTE_PATHS.SERVER_STATUS+'?token='+encodeURIComponent(token),
                {signal: AbortSignal.timeout(this.timeoutMs)}
            );
            status.latencyMs = Date.now() - requestStartTime;
            if(!response.ok){
                status.error = 'Status request failed with status '+response.status+'.';
                Logger.warning(status.error, serverUrl);
                return status;
            }
            let usageReport = await response.json();
            if(!sc.hasOwn(usageReport, 'isBlocking')){
                status.error = 'Invalid status response.';
                Logger.warning(status.error, serverUrl);
                return status;
            }
            status.usageReport = usageReport;
            status.isReachable = true;
        } catch (error) {
            status.latencyMs = Date.now() - requestStartTime;
            status.error = 'Status request error: '+error.message;
            Logger.warning(status.error, serverUrl);
        }
        return status;
    }

}

module.exports.RemoteServersStatus = RemoteServersStatus;
