/**
 *
 * Reldens - SignedServerToServerMessenger
 *
 * Sends and receives the signed messages a feature exchanges with the other game servers on its own route. Every
 * message token signs the route, the destination server, the action, the target, the payload and a unique nonce, and it
 * is accepted once; the feature subclass handles the received actions (receiveAction). A message to several servers
 * starts every request before any answer is awaited, so the unreachable servers cost one timeout, not one each.
 *
 */

const { ServerUrlMatcher } = require('../server-url-matcher');
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
        /** @type {string} */
        this.routePath = props.routePath;
    }

    /**
     * @param {string} roomName
     * @returns {string}
     */
    serverUrlForRoom(roomName)
    {
        let serverAddress = ServerUrlMatcher.fetchServerAddress(sc.get(this.roomsServers, roomName, ''));
        return -1 === this.otherServersUrls.indexOf(serverAddress) ? '' : serverAddress;
    }

    /**
     * @param {Array<string>} serversUrls
     * @param {string} action
     * @param {number|string} targetId
     * @param {Object} payload
     * @returns {Promise<Array<{serverUrl: string, response: Object|boolean}>>}
     */
    async sendToServers(serversUrls, action, targetId, payload)
    {
        let pendingResponses = [];
        for(let serverUrl of serversUrls){
            pendingResponses.push({serverUrl, response: this.sendRequest(serverUrl, action, targetId, payload)});
        }
        let responses = [];
        for(let pendingResponse of pendingResponses){
            responses.push({serverUrl: pendingResponse.serverUrl, response: await pendingResponse.response});
        }
        return responses;
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
        let targetIdValue = String(targetId);
        let payloadJson = sc.toJsonString(payload);
        let nonce = Encryptor.generateSecureToken(GameConst.SERVERS_SYNC.NONCE_BYTES);
        let token = this.expiringHmacToken.generate(
            [this.routePath, ServerUrlMatcher.fetchServerAddress(serverUrl), action, targetIdValue, payloadJson, nonce],
            Date.now()+GameConst.SIGNED_TOKENS.SERVERS_SYNC_EXPIRATION
        );
        if(!token){
            Logger.error('Servers sync token could not be generated, check the signed tokens secret.');
            return false;
        }
        let body = sc.toJsonString({action, targetId: targetIdValue, payload: payloadJson, nonce, token});
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
     * @param {ExpressRequest} req
     * @returns {Promise<ServerToServerAnswer>}
     */
    async receiveRequest(req)
    {
        let action = sc.get(req.body, 'action', '');
        let targetId = sc.get(req.body, 'targetId', '');
        let payloadJson = sc.get(req.body, 'payload', '');
        let token = sc.get(req.body, 'token', '');
        let now = Date.now();
        if(
            '' === this.serverSelfAddress
            || !sc.isString(action)
            || !sc.isString(targetId)
            || '' === targetId
            || !sc.isString(payloadJson)
            || !this.expiringHmacToken.validate(
                [
                    this.routePath,
                    this.serverSelfAddress,
                    action,
                    targetId,
                    payloadJson,
                    String(sc.get(req.body, 'nonce', ''))
                ],
                token,
                now
            )
            || !this.expiringHmacToken.markUsed(token, now)
        ){
            Logger.warning('Invalid servers sync request on route: '+this.routePath, {action, targetId});
            return {isSuccess: false};
        }
        let payload = sc.parseJson(payloadJson);
        if(!sc.isObject(payload)){
            return {isSuccess: false};
        }
        return await this.receiveAction(action, targetId, payload);
    }

}

module.exports.SignedServerToServerMessenger = SignedServerToServerMessenger;
