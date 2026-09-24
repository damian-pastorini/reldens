/**
 *
 * Reldens - AdminSessionStore
 *
 * Express session store for the administration panel sessions over the admin_sessions entity, so the sessions are
 * shared by every server, survive a restart and expire. The expired rows are pruned on an interval.
 *
 */

const { Store } = require('express-session');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/storage').BaseDriver} BaseDriver
 *
 * @typedef {Object} AdminSessionStoreProps
 * @property {BaseDriver} sessionsRepository
 * @property {number} [ttlMs]
 * @property {number} [pruneIntervalMs]
 */
class AdminSessionStore extends Store
{

    /**
     * @param {AdminSessionStoreProps} props
     */
    constructor(props)
    {
        super();
        /** @type {BaseDriver} */
        this.sessionsRepository = props.sessionsRepository;
        /** @type {number} */
        this.ttlMs = Number(sc.get(props, 'ttlMs', 0));
        if(0 >= this.ttlMs){
            this.ttlMs = 86400000;
        }
        /** @type {number} */
        this.pruneIntervalMs = Number(sc.get(props, 'pruneIntervalMs', 3600000));
        /** @type {Object} */
        this.pruneTimer = setInterval(() => {
            this.pruneExpired(Date.now()).catch((error) => Logger.error('Admin sessions prune error: '+error.message));
        }, this.pruneIntervalMs);
        this.pruneTimer.unref();
    }

    /**
     * @param {string} sessionId
     * @param {function(Error|null, Object|null=): void} callback
     */
    get(sessionId, callback)
    {
        this.loadSession(sessionId, Date.now()).then((sessionData) => callback(null, sessionData)).catch(callback);
    }

    /**
     * @param {string} sessionId
     * @param {Object} sessionData
     * @param {function(Error|null=): void} callback
     */
    set(sessionId, sessionData, callback)
    {
        this.storeSession(sessionId, sessionData).then(() => callback(null)).catch(callback);
    }

    /**
     * @param {string} sessionId
     * @param {function(Error|null=): void} callback
     */
    destroy(sessionId, callback)
    {
        this.sessionsRepository.delete({sid: sessionId}).then(() => callback(null)).catch(callback);
    }

    /**
     * @param {string} sessionId
     * @param {Object} sessionData
     * @param {function(Error|null=): void} callback
     */
    touch(sessionId, sessionData, callback)
    {
        this.sessionsRepository.update({sid: sessionId}, {expires: this.expirationTime(sessionData)})
            .then(() => callback(null))
            .catch(callback);
    }

    /**
     * @param {string} sessionId
     * @param {number} now
     * @returns {Promise<Object|null>}
     */
    async loadSession(sessionId, now)
    {
        let storedSession = await this.sessionsRepository.loadOneBy('sid', sessionId);
        if(!storedSession){
            return null;
        }
        if(Number(storedSession.expires) <= now){
            await this.sessionsRepository.delete({sid: sessionId});
            return null;
        }
        return sc.parseJson(storedSession.data, null);
    }

    /**
     * @param {string} sessionId
     * @param {Object} sessionData
     * @returns {Promise<boolean>}
     */
    async storeSession(sessionId, sessionData)
    {
        let sessionRow = {data: sc.toJsonString(sessionData), expires: this.expirationTime(sessionData)};
        if(await this.sessionsRepository.loadOneBy('sid', sessionId)){
            await this.sessionsRepository.update({sid: sessionId}, sessionRow);
            return true;
        }
        await this.sessionsRepository.create({sid: sessionId, ...sessionRow});
        return true;
    }

    /**
     * @param {Object} sessionData
     * @returns {number}
     */
    expirationTime(sessionData)
    {
        let cookieExpires = sc.get(sessionData?.cookie, 'expires', false);
        if(cookieExpires){
            return new Date(cookieExpires).getTime();
        }
        return Date.now() + this.ttlMs;
    }

    /**
     * @param {number} now
     * @returns {Promise<boolean>}
     */
    async pruneExpired(now)
    {
        await this.sessionsRepository.delete({expires: {operator: 'LTE', value: now}});
        return true;
    }

}

module.exports.AdminSessionStore = AdminSessionStore;
