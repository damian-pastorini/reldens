/**
 *
 * Reldens - SignedServerToServerMessenger
 *
 * Sends and receives the signed messages a feature exchanges with the other game servers on its own route: the teams,
 * clans, private messages and deleted rooms sync, the user disconnection and the names check. Every message token signs
 * the route, the destination server (accepted on any address of this server, its public or base URL), the action, the
 * target, the payload and a unique nonce, and it is accepted once; the feature subclass handles the received actions
 * (receiveAction). A message to several servers is sent to every server, one after the other, and each answer (false
 * when the server did not confirm it) is handled by the caller processResponse right after it, so a failed server
 * never stops the next ones.
 *
 */

const { GameConst } = require('../constants');
const { Encryptor } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('express').Request} ExpressRequest
 * @typedef {import('./expiring-hmac-token').ExpiringHmacToken} ExpiringHmacToken
 *
 * @typedef {Object} SignedServerToServerMessengerProps
 * @property {ExpiringHmacToken} expiringHmacToken
 * @property {Object<string, string>} roomsServers
 * @property {Array<string>} otherServersUrls
 * @property {string} serverSelfAddress
 * @property {Array<string>} serverSelfAddresses
 * @property {string} routePath
 *
 * @typedef {Object} ServerToServerAnswer
 * @property {boolean} isSuccess
 */
class SignedServerToServerMessenger
{

    /**
     * @param {SignedServerToServerMessengerProps} props
     */
    constructor(props)
    {
        /** @type {ExpiringHmacToken} */
        this.expiringHmacToken = props.expiringHmacToken;
        /** @type {Object<string, string>} */
        this.roomsServers = props.roomsServers;
        /** @type {Array<string>} */
        this.otherServersUrls = props.otherServersUrls;
        /** @type {string} */
        this.serverSelfAddress = props.serverSelfAddress;
        /** @type {Array<string>} */
        this.serverSelfAddresses = props.serverSelfAddresses;
        /** @type {string} */
        this.routePath = props.routePath;
    }

    /**
     * @param {string} roomName
     * @returns {string}
     */
    serverUrlForRoom(roomName)
    {
        let serverAddress = sc.get(this.roomsServers, roomName, '');
        return -1 === this.otherServersUrls.indexOf(serverAddress) ? '' : serverAddress;
    }

    /**
     * @param {Array<string>} serversUrls
     * @param {string} action
     * @param {number|string} targetId
     * @param {Object} payload
     * @param {function(Object|boolean, string): void} [processResponse]
     * @returns {Promise<void>}
     */
    async sendToServers(serversUrls, action, targetId, payload, processResponse)
    {
        for(let serverUrl of serversUrls){
            let response = await this.sendRequest(serverUrl, action, targetId, payload);
            if(sc.isFunction(processResponse)){
                processResponse(response, serverUrl);
            }
        }
    }

    /**
     * @param {string} serverUrl
     * @param {string} action
     * @param {number|string} targetId
     * @param {Object} payload
     * @returns {Object|boolean}
     */
    createRequestBody(serverUrl, action, targetId, payload)
    {
        let targetIdValue = String(targetId);
        let payloadJson = sc.toJsonString(payload);
        let nonce = Encryptor.generateSecureToken(GameConst.SERVERS_SYNC.NONCE_BYTES);
        let token = this.expiringHmacToken.generate(
            [this.routePath, serverUrl, action, targetIdValue, payloadJson, nonce],
            Date.now()+GameConst.SIGNED_TOKENS.SERVERS_SYNC_EXPIRATION
        );
        if(!token){
            Logger.error('Servers sync token could not be generated, check the signed tokens secret.');
            return false;
        }
        return {action, targetId: targetIdValue, payload: payloadJson, nonce, token};
    }

    /**
     * @param {string} serverUrl
     * @param {string} action
     * @param {number|string} targetId
     * @param {Object} payload
     * @returns {Promise<Object|boolean>}
     */
    async sendRequest(serverUrl, action, targetId, payload)
    {
        let requestBody = this.createRequestBody(serverUrl, action, targetId, payload);
        if(!requestBody){
            return false;
        }
        let body = sc.toJsonString(requestBody);
        try {
            let response = await fetch(serverUrl+this.routePath, {
                method: 'POST',
                headers: {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body)},
                body,
                signal: AbortSignal.timeout(GameConst.SERVERS_SYNC.REQUEST_TIMEOUT_MS)
            });
            if(!response.ok){
                Logger.error('Servers sync "'+action+'" failed with status: '+response.status, serverUrl);
                return false;
            }
            let answer = await response.json();
            if(true !== sc.get(answer, 'isSuccess', false)){
                return false;
            }
            return answer;
        } catch (error) {
            Logger.error('Servers sync "'+action+'" request error.', serverUrl, error.message);
            return false;
        }
    }

    /**
     * @param {ExpressRequest} req
     * @param {Object} res
     * @returns {Promise<Object>}
     */
    async handleRouteRequest(req, res)
    {
        try {
            return res.json(await this.receiveRequest(req));
        } catch (error) {
            Logger.error('Servers sync request error.', error.message);
            return res.status(500).json({isSuccess: false});
        }
    }

    /**
     * @param {Object} serverManager
     */
    registerRoute(serverManager)
    {
        let invalidRequestsLimiter = serverManager.appServerFactory.rateLimitConfigurer.createHomeLimiter();
        serverManager.app.post(
            this.routePath,
            (req, res, next) => this.isUnusedSignedRequest(req) ? next() : invalidRequestsLimiter(req, res, next),
            this.handleRouteRequest.bind(this)
        );
    }

    /**
     * @param {ExpressRequest} req
     * @returns {boolean}
     */
    isUnusedSignedRequest(req)
    {
        let now = Date.now();
        return !this.expiringHmacToken.isUsed(sc.get(req.body, 'token', ''), now) && this.isValidRequest(req.body, now);
    }

    /**
     * @param {Object} requestData
     * @param {number} now
     * @returns {boolean}
     */
    isValidRequest(requestData, now)
    {
        let action = sc.get(requestData, 'action', '');
        let targetId = sc.get(requestData, 'targetId', '');
        let payloadJson = sc.get(requestData, 'payload', '');
        return sc.isString(action)
            && sc.isString(targetId)
            && '' !== targetId
            && sc.isString(payloadJson)
            && this.serverSelfAddresses.some((serverSelfAddress) => this.expiringHmacToken.validate(
                [
                    this.routePath,
                    serverSelfAddress,
                    action,
                    targetId,
                    payloadJson,
                    String(sc.get(requestData, 'nonce', ''))
                ],
                sc.get(requestData, 'token', ''),
                now
            ));
    }

    /**
     * @param {ExpressRequest} req
     * @returns {Promise<ServerToServerAnswer>}
     */
    async receiveRequest(req)
    {
        let action = sc.get(req.body, 'action', '');
        let targetId = sc.get(req.body, 'targetId', '');
        let now = Date.now();
        if(!this.isValidRequest(req.body, now) || !this.expiringHmacToken.markUsed(sc.get(req.body, 'token', ''), now)){
            Logger.warning('Invalid servers sync request on route: '+this.routePath, {action, targetId});
            return {isSuccess: false};
        }
        let payload = sc.parseJson(sc.get(req.body, 'payload', ''));
        if(!sc.isObject(payload)){
            return {isSuccess: false};
        }
        return await this.receiveAction(action, targetId, payload);
    }

}

module.exports.SignedServerToServerMessenger = SignedServerToServerMessenger;
