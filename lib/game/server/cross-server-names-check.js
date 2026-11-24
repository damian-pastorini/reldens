/**
 *
 * Reldens - CrossServerNamesCheck
 *
 * Keeps the usernames, the emails and the player names unique between the servers with their own database
 * (server/rooms/databases): a new value is held here and on every other server under its own hold ID until its creation
 * ends, with signed one-use requests bound to the target server.
 *
 */

const { ServerUrlMatcher } = require('../server-url-matcher');
const { GameConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('express').Request} ExpressRequest
 *
 * @typedef {Object} CrossServerNamesCheckProps
 * @property {Array<string>} serversUrls
 * @property {string} serverSelfAddress
 * @property {ExpiringHmacToken} expiringHmacToken
 * @property {UsersManager} usersManager
 *
 * @typedef {Object} HeldValue
 * @property {number} expiresAt
 * @property {string} holdId
 */
class CrossServerNamesCheck
{

    /**
     * @param {CrossServerNamesCheckProps} props
     */
    constructor(props)
    {
        /** @type {Array<string>} */
        this.serversUrls = props.serversUrls;
        /** @type {string} */
        this.serverSelfAddress = props.serverSelfAddress;
        /** @type {ExpiringHmacToken} */
        this.expiringHmacToken = props.expiringHmacToken;
        /** @type {UsersManager} */
        this.usersManager = props.usersManager;
        /** @type {Object<string, HeldValue>} */
        this.heldValues = {};
        /** @type {Object<string, number>} */
        this.valuesCountByRoute = {
            [GameConst.ROUTE_PATHS.CHECK_USER_NAME]: 2,
            [GameConst.ROUTE_PATHS.CHECK_PLAYER_NAME]: 1
        };
    }

    /**
     * @param {string} routePath
     * @param {Array<string>} values
     * @returns {Promise<string|boolean>}
     */
    async holdEverywhere(routePath, values)
    {
        let holdId = sc.randomChars(GameConst.NAMES_CHECK.HOLD_ID_LENGTH);
        if(0 === this.serversUrls.length){
            return holdId;
        }
        if(!this.hold(routePath, values, GameConst.NAMES_CHECK.LOCAL_HOLD_MS, holdId)){
            return false;
        }
        for(let serverUrl of this.serversUrls){
            if(!await this.sendSignedRequest(serverUrl, routePath, values, holdId, GameConst.NAMES_CHECK.CHECK_ACTION)){
                await this.release(routePath, values, holdId);
                return false;
            }
        }
        return holdId;
    }

    /**
     * @param {string} routePath
     * @param {Array<string>} values
     * @param {number} holdMs
     * @param {string} holdId
     * @returns {boolean}
     */
    hold(routePath, values, holdMs, holdId)
    {
        let now = Date.now();
        this.removeExpiredHolds(now);
        if(values.some(value => sc.hasOwn(this.heldValues, this.holdKey(routePath, value)))){
            return false;
        }
        for(let value of values){
            this.heldValues[this.holdKey(routePath, value)] = {expiresAt: now+holdMs, holdId};
        }
        return true;
    }

    /**
     * @param {string} routePath
     * @param {Array<string>} values
     * @param {string} holdId
     * @returns {Promise<boolean>}
     */
    async release(routePath, values, holdId)
    {
        if(0 === this.serversUrls.length){
            return false;
        }
        this.removeHolds(routePath, values, holdId);
        for(let serverUrl of this.serversUrls){
            await this.sendSignedRequest(serverUrl, routePath, values, holdId, GameConst.NAMES_CHECK.RELEASE_ACTION);
        }
        return true;
    }

    /**
     * @param {string} routePath
     * @param {Array<string>} values
     * @param {string} holdId
     */
    removeHolds(routePath, values, holdId)
    {
        for(let value of values){
            let holdKey = this.holdKey(routePath, value);
            if(holdId === sc.get(this.heldValues[holdKey], 'holdId', false)){
                delete this.heldValues[holdKey];
            }
        }
    }

    /**
     * @param {number} now
     */
    removeExpiredHolds(now)
    {
        for(let holdKey of Object.keys(this.heldValues)){
            if(now >= this.heldValues[holdKey].expiresAt){
                delete this.heldValues[holdKey];
            }
        }
    }

    /**
     * @param {string} routePath
     * @param {string} value
     * @returns {string}
     */
    holdKey(routePath, value)
    {
        return routePath+':'+String(value).toLowerCase();
    }

    /**
     * @param {string} serverUrl
     * @param {string} routePath
     * @param {Array<string>} values
     * @param {string} holdId
     * @param {string} action
     * @returns {Promise<boolean>}
     */
    async sendSignedRequest(serverUrl, routePath, values, holdId, action)
    {
        let token = this.expiringHmacToken.generate(
            [routePath, ServerUrlMatcher.fetchServerAddress(serverUrl), action, holdId, ...values],
            Date.now()+GameConst.SIGNED_TOKENS.NAMES_CHECK_EXPIRATION
        );
        if(!token){
            Logger.error('Names check token could not be generated, check the signed tokens secret.');
            return false;
        }
        let body = sc.toJsonString({values, holdId, action, token});
        try {
            let response = await fetch(serverUrl+routePath, {
                method: 'POST',
                headers: {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body)},
                body,
                signal: AbortSignal.timeout(GameConst.NAMES_CHECK.REQUEST_TIMEOUT_MS)
            });
            if(!response?.ok){
                Logger.error('Names check failed with status: '+response?.status, serverUrl);
                return false;
            }
            return true === sc.get(await response.json(), 'isAvailable', false);
        } catch(error) {
            Logger.error('Names check request error, the values are not taken as free.', serverUrl, error.message);
            return false;
        }
    }

    /**
     * @param {ExpressRequest} req
     * @param {string} routePath
     * @returns {Promise<boolean>}
     */
    async isRequestAvailable(req, routePath)
    {
        let values = sc.get(req.body, 'values', false);
        let holdId = sc.get(req.body, 'holdId', '');
        let action = sc.get(req.body, 'action', '');
        let token = sc.get(req.body, 'token', '');
        let now = Date.now();
        if(
            !this.isValidValues(routePath, values)
            || !this.isValidHoldRequest(holdId, action)
            || !this.expiringHmacToken.validate(
                [routePath, this.serverSelfAddress, action, holdId, ...values],
                token,
                now
            )
            || !this.expiringHmacToken.markUsed(token, now)
        ){
            Logger.warning('Invalid names check request on route: '+routePath);
            return false;
        }
        if(GameConst.NAMES_CHECK.RELEASE_ACTION === action){
            this.removeHolds(routePath, values, holdId);
            return true;
        }
        if(!await this.isStoredValueFree(routePath, values)){
            return false;
        }
        return this.hold(routePath, values, GameConst.NAMES_CHECK.REMOTE_HOLD_MS, holdId);
    }

    /**
     * @param {string} holdId
     * @param {string} action
     * @returns {boolean}
     */
    isValidHoldRequest(holdId, action)
    {
        return sc.isString(holdId)
            && GameConst.NAMES_CHECK.HOLD_ID_LENGTH === holdId.length
            && -1 !== [GameConst.NAMES_CHECK.CHECK_ACTION, GameConst.NAMES_CHECK.RELEASE_ACTION].indexOf(action);
    }

    /**
     * @param {string} routePath
     * @param {Array<string>|boolean} values
     * @returns {boolean}
     */
    isValidValues(routePath, values)
    {
        return sc.isArray(values)
            && sc.get(this.valuesCountByRoute, routePath, 0) === values.length
            && values.every(value => sc.isString(value) && '' !== value && 255 >= value.length);
    }

    /**
     * @param {string} routePath
     * @param {Array<string>} values
     * @returns {Promise<boolean>}
     */
    async isStoredValueFree(routePath, values)
    {
        if(GameConst.ROUTE_PATHS.CHECK_PLAYER_NAME === routePath){
            return await this.usersManager.isNameAvailable(values[0]);
        }
        return !await this.usersManager.loadUserByUsername(values[0])
            && !await this.usersManager.loadUserByEmail(values[1]);
    }

}

module.exports.CrossServerNamesCheck = CrossServerNamesCheck;
