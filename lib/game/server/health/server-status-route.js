/**
 *
 * Reldens - ServerStatusRoute
 *
 * Answers the server status requested by the other servers of a multi-server setup (RemoteServersStatus): the
 * ServerHealthMonitor usage report, only for the requests signed with the shared signed tokens secret.
 *
 */

const { HealthConst } = require('./constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('./server-health-monitor').ServerHealthMonitor} ServerHealthMonitor
 * @typedef {import('../expiring-hmac-token').ExpiringHmacToken} ExpiringHmacToken
 * @typedef {import('express').Request} ExpressRequest
 * @typedef {import('express').Response} ExpressResponse
 */
class ServerStatusRoute
{

    /**
     * @param {Object} props
     * @param {ServerHealthMonitor} props.serverHealthMonitor
     * @param {ExpiringHmacToken} props.expiringHmacToken
     */
    constructor(props)
    {
        /** @type {ServerHealthMonitor} */
        this.serverHealthMonitor = props.serverHealthMonitor;
        /** @type {ExpiringHmacToken} */
        this.expiringHmacToken = props.expiringHmacToken;
        /** @type {number} */
        this.forbiddenStatusCode = 403;
    }

    /**
     * @param {ExpressRequest} req
     * @param {ExpressResponse} res
     * @returns {Object}
     */
    handle(req, res)
    {
        let token = sc.get(req.query, 'token', '');
        if(!this.expiringHmacToken.validate([HealthConst.STATUS_TOKEN_VALUE], token, Date.now())){
            Logger.warning('Invalid server status token.', {requestAddress: req.ip});
            return res.status(this.forbiddenStatusCode).json({error: true});
        }
        return res.json(this.serverHealthMonitor.usageReport);
    }

}

module.exports.ServerStatusRoute = ServerStatusRoute;
