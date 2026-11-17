/**
 *
 * Reldens - CrossServerNamesCheck
 *
 * Keeps the usernames, the emails and the player names unique between the servers that have their own database (the
 * server/rooms/databases config, the comma separated URLs of those servers). Before this server stores a new user or a
 * new player it holds the values on itself, so a check from another server never gives them away, and asks every other
 * listed server with a signed request if the values are free there; the values are stored only when every server
 * answers they are free, and the caller releases the hold once the store ends. A server answering a check rejects the
 * values held on it or already stored in its database (the player names with the same guests rules as the local
 * check), otherwise it holds them for REMOTE_HOLD_MS, so two servers asking each other at the same time never both pass.
 * The request token signs the check route with the values, so the token of another signed request (like the
 * disconnection) is never valid for a check. A server that does not answer in time counts as the values not being free.
 *
 */

const { GameConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('express').Request} ExpressRequest
 *
 * @typedef {Object} CrossServerNamesCheckProps
 * @property {Array<string>} serversUrls
 * @property {ExpiringHmacToken} expiringHmacToken
 * @property {UsersManager} usersManager
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
        /** @type {ExpiringHmacToken} */
        this.expiringHmacToken = props.expiringHmacToken;
        /** @type {UsersManager} */
        this.usersManager = props.usersManager;
        /** @type {Object<string, number>} */
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
     * @returns {Promise<boolean>}
     */
    async holdEverywhere(routePath, values)
    {
        if(0 === this.serversUrls.length){
            return true;
        }
        if(!this.hold(routePath, values, GameConst.NAMES_CHECK.LOCAL_HOLD_MS)){
            return false;
        }
        for(let serverUrl of this.serversUrls){
            if(!await this.requestCheck(serverUrl, routePath, values)){
                this.release(routePath, values);
                return false;
            }
        }
        return true;
    }

    /**
     * @param {string} routePath
     * @param {Array<string>} values
     * @param {number} holdMs
     * @returns {boolean}
     */
    hold(routePath, values, holdMs)
    {
        let now = Date.now();
        this.removeExpiredHolds(now);
        if(values.some(value => sc.hasOwn(this.heldValues, this.holdKey(routePath, value)))){
            return false;
        }
        for(let value of values){
            this.heldValues[this.holdKey(routePath, value)] = now+holdMs;
        }
        return true;
    }

    /**
     * @param {string} routePath
     * @param {Array<string>} values
     * @returns {boolean}
     */
    release(routePath, values)
    {
        if(0 === this.serversUrls.length){
            return false;
        }
        for(let value of values){
            delete this.heldValues[this.holdKey(routePath, value)];
        }
        return true;
    }

    /**
     * @param {number} now
     */
    removeExpiredHolds(now)
    {
        for(let holdKey of Object.keys(this.heldValues)){
            if(now >= this.heldValues[holdKey]){
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
     * @returns {Promise<boolean>}
     */
    async requestCheck(serverUrl, routePath, values)
    {
        let token = this.expiringHmacToken.generate(
            [routePath, ...values],
            Date.now()+GameConst.SIGNED_TOKENS.NAMES_CHECK_EXPIRATION
        );
        if(!token){
            Logger.error('Names check token could not be generated, check the signed tokens secret.');
            return false;
        }
        let body = sc.toJsonString({values, token});
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
        if(
            !this.isValidValues(routePath, values)
            || !this.expiringHmacToken.validate([routePath, ...values], sc.get(req.body, 'token', ''), Date.now())
        ){
            Logger.warning('Invalid names check request on route: '+routePath);
            return false;
        }
        if(!await this.isStoredValueFree(routePath, values)){
            return false;
        }
        return this.hold(routePath, values, GameConst.NAMES_CHECK.REMOTE_HOLD_MS);
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
