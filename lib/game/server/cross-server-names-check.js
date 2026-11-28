/**
 *
 * Reldens - CrossServerNamesCheck
 *
 * Keeps the values of its names route unique between the servers with their own database (server/rooms/databases):
 * the usernames and emails on the user name route, the player names on the player name route. A new value is held here
 * and on every other server under its own hold ID until its creation ends, with the signed one-use messages of its
 * route (the hold ID is the message target), and a check refused or failed on any server releases the holds everywhere
 * once every check answered.
 *
 */

const { SignedServerToServerMessenger } = require('./signed-server-to-server-messenger');
const { GameConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('./signed-server-to-server-messenger').SignedServerToServerMessengerProps} MessengerProps
 *
 * @typedef {Object} CrossServerNamesCheckProps
 * @property {Array<string>} serversUrls
 * @property {UsersManager} usersManager
 *
 * @typedef {Object} HeldValue
 * @property {number} expiresAt
 * @property {string} holdId
 */
class CrossServerNamesCheck extends SignedServerToServerMessenger
{

    /**
     * @param {MessengerProps & CrossServerNamesCheckProps} props
     */
    constructor(props)
    {
        super(props);
        /** @type {Array<string>} */
        this.serversUrls = props.serversUrls;
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
     * @param {Array<string>} values
     * @returns {Promise<string|boolean>}
     */
    async holdEverywhere(values)
    {
        let holdId = sc.randomChars(GameConst.NAMES_CHECK.HOLD_ID_LENGTH);
        if(0 === this.serversUrls.length){
            return holdId;
        }
        if(!this.hold(values, GameConst.NAMES_CHECK.LOCAL_HOLD_MS, holdId)){
            return false;
        }
        if(!await this.sendToEveryServer(GameConst.NAMES_CHECK.CHECK_ACTION, holdId, values)){
            await this.release(values, holdId);
            return false;
        }
        return holdId;
    }

    /**
     * @param {Array<string>} values
     * @param {string} holdId
     * @returns {Promise<boolean>}
     */
    async release(values, holdId)
    {
        if(0 === this.serversUrls.length){
            return false;
        }
        this.removeHolds(values, holdId);
        return await this.sendToEveryServer(GameConst.NAMES_CHECK.RELEASE_ACTION, holdId, values);
    }

    /**
     * @param {string} action
     * @param {string} holdId
     * @param {Array<string>} values
     * @returns {Promise<boolean>}
     */
    async sendToEveryServer(action, holdId, values)
    {
        return (await this.sendToServers(this.serversUrls, action, holdId, {values})).every(
            (serverResponse) => false !== serverResponse.response
        );
    }

    /**
     * @param {Array<string>} values
     * @param {number} holdMs
     * @param {string} holdId
     * @returns {boolean}
     */
    hold(values, holdMs, holdId)
    {
        let now = Date.now();
        this.removeExpiredHolds(now);
        if(values.some(value => sc.hasOwn(this.heldValues, String(value).toLowerCase()))){
            return false;
        }
        for(let value of values){
            this.heldValues[String(value).toLowerCase()] = {expiresAt: now+holdMs, holdId};
        }
        return true;
    }

    /**
     * @param {Array<string>} values
     * @param {string} holdId
     */
    removeHolds(values, holdId)
    {
        for(let value of values){
            let holdKey = String(value).toLowerCase();
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
     * @param {string} action
     * @param {string} holdId
     * @param {Object} payload
     * @returns {Promise<{isSuccess: boolean}>}
     */
    async receiveAction(action, holdId, payload)
    {
        let values = sc.get(payload, 'values', false);
        if(!this.isValidValues(values) || !this.isValidHoldRequest(holdId, action)){
            Logger.warning('Invalid names check request on route: '+this.routePath);
            return {isSuccess: false};
        }
        if(GameConst.NAMES_CHECK.RELEASE_ACTION === action){
            this.removeHolds(values, holdId);
            return {isSuccess: true};
        }
        return {
            isSuccess: await this.isStoredValueFree(values)
                && this.hold(values, GameConst.NAMES_CHECK.REMOTE_HOLD_MS, holdId)
        };
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
     * @param {Array<string>|boolean} values
     * @returns {boolean}
     */
    isValidValues(values)
    {
        return sc.isArray(values)
            && sc.get(this.valuesCountByRoute, this.routePath, 0) === values.length
            && values.every(value => sc.isString(value) && '' !== value && 255 >= value.length);
    }

    /**
     * @param {Array<string>} values
     * @returns {Promise<boolean>}
     */
    async isStoredValueFree(values)
    {
        if(GameConst.ROUTE_PATHS.CHECK_PLAYER_NAME === this.routePath){
            return await this.usersManager.isNameAvailable(values[0]);
        }
        return !await this.usersManager.loadUserByUsername(values[0])
            && !await this.usersManager.loadUserByEmail(values[1]);
    }

}

module.exports.CrossServerNamesCheck = CrossServerNamesCheck;
