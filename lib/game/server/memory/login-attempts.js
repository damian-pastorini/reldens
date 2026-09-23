/**
 *
 * Reldens - LoginAttempts
 *
 * In memory registry of the failed logins, the joins and the accounts created per address. The hits are kept in a
 * sliding window and the identities or addresses over the maximum are blocked until the block time passes.
 *
 */

const { Logger, sc } = require('@reldens/utils');

class LoginAttempts
{

    /**
     * @param {Object} props
     */
    constructor(props)
    {
        /** @type {boolean} */
        this.enabled = Boolean(sc.get(props, 'enabled', true));
        /** @type {number} */
        this.maxAttempts = Number(sc.get(props, 'maxAttempts', 10));
        /** @type {number} */
        this.blockTimeMs = Number(sc.get(props, 'blockTimeMs', 900000));
        /** @type {number} */
        this.windowMs = Number(sc.get(props, 'windowMs', this.blockTimeMs));
        /** @type {Object|boolean} */
        this.ipListsRepository = sc.get(props, 'ipListsRepository', false);
        /** @type {string} */
        this.addressKeyPrefix = 'address:';
        /** @type {Object<string, Array<number>>} */
        this.hitsByKey = {};
        /** @type {Object<string, number>} */
        this.blockedUntilByKey = {};
    }

    /**
     * @param {string} key
     * @param {number} blockedUntil
     * @returns {boolean}
     */
    persistAddressBlock(key, blockedUntil)
    {
        if(!this.ipListsRepository){
            return false;
        }
        if(0 !== key.indexOf(this.addressKeyPrefix)){
            return false;
        }
        let blockedAddress = key.substring(this.addressKeyPrefix.length);
        this.ipListsRepository.create({
            address: blockedAddress,
            list_type: 'deny',
            reason: 'Login attempts limit reached.',
            expires_at: sc.formatDate(new Date(blockedUntil))
        }).catch((error) => Logger.error('The address block could not be stored: '+error.message));
        return true;
    }

    /**
     * @param {string} key
     * @param {number} now
     * @param {number} [windowMs]
     * @returns {number}
     */
    countHits(key, now, windowMs = 0)
    {
        if(!this.hitsByKey[key]){
            return 0;
        }
        let appliedWindow = windowMs || this.windowMs;
        this.hitsByKey[key] = this.hitsByKey[key].filter((hitTime) => hitTime > now - appliedWindow);
        if(0 === this.hitsByKey[key].length){
            delete this.hitsByKey[key];
            return 0;
        }
        return this.hitsByKey[key].length;
    }

    /**
     * @param {string} key
     * @param {number} now
     * @param {number} [windowMs]
     * @returns {number}
     */
    registerHit(key, now, windowMs = 0)
    {
        if(!key){
            return 0;
        }
        let currentHits = this.countHits(key, now, windowMs);
        if(!this.hitsByKey[key]){
            this.hitsByKey[key] = [];
        }
        this.hitsByKey[key].push(now);
        return currentHits + 1;
    }

    /**
     * @param {string} key
     * @param {number} now
     * @returns {boolean}
     */
    registerFailure(key, now)
    {
        if(!this.enabled){
            return false;
        }
        if(!key){
            return false;
        }
        if(this.maxAttempts > this.registerHit(key, now)){
            return false;
        }
        this.blockedUntilByKey[key] = now + this.blockTimeMs;
        delete this.hitsByKey[key];
        this.persistAddressBlock(key, this.blockedUntilByKey[key]);
        Logger.warning('Login attempts limit reached, temporary block applied.', {attemptsKey: key});
        return true;
    }

    /**
     * @param {string} key
     * @param {number} now
     * @returns {boolean}
     */
    isBlocked(key, now)
    {
        if(!this.enabled){
            return false;
        }
        if(!key){
            return false;
        }
        if(!this.blockedUntilByKey[key]){
            return false;
        }
        if(this.blockedUntilByKey[key] > now){
            return true;
        }
        delete this.blockedUntilByKey[key];
        return false;
    }

    /**
     * @param {string} key
     */
    clear(key)
    {
        delete this.hitsByKey[key];
        delete this.blockedUntilByKey[key];
    }

    reset()
    {
        this.hitsByKey = {};
        this.blockedUntilByKey = {};
    }

}

module.exports.LoginAttempts = LoginAttempts;
