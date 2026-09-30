/**
 *
 * Reldens - LoginAttempts
 *
 * In memory registry of the failed logins, the joins and the accounts created per address. The hits are kept in a
 * sliding window and the identities or addresses over the maximum are blocked until the block time passes. The expired
 * keys are swept once per window and the tracked keys are capped, evicting the oldest key when the cap is reached.
 *
 */

const { GameConst } = require('../../constants');
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
        /** @type {number} */
        this.maxTrackedKeys = Number(sc.get(props, 'maxTrackedKeys', 50000));
        /** @type {number} */
        this.maxIdentityLength = Number(sc.get(props, 'maxIdentityLength', 255));
        /** @type {Object|boolean} */
        this.ipListsRepository = sc.get(props, 'ipListsRepository', false);
        /** @type {Map<string, Array<number>>} */
        this.hitsByKey = new Map();
        /** @type {Map<string, number>} */
        this.windowByKey = new Map();
        /** @type {Map<string, number>} */
        this.blockedUntilByKey = new Map();
        /** @type {number} */
        this.lastSweepTime = 0;
    }

    /**
     * @param {number} now
     * @returns {Promise<number>}
     */
    async restoreAddressBlocks(now)
    {
        if(!this.ipListsRepository){
            return 0;
        }
        let restoredBlocks = 0;
        for(let storedBlock of await this.ipListsRepository.loadBy('list_type', 'deny')){
            if(!storedBlock.expires_at){
                continue;
            }
            let blockedUntil = new Date(storedBlock.expires_at).getTime();
            if(blockedUntil <= now){
                continue;
            }
            this.blockedUntilByKey.set(GameConst.LOGIN_ATTEMPTS_KEYS.ADDRESS+storedBlock.address, blockedUntil);
            restoredBlocks++;
        }
        return restoredBlocks;
    }

    /**
     * @param {string} key
     * @param {number} blockedUntil
     * @returns {Promise<boolean>}
     */
    async persistAddressBlock(key, blockedUntil)
    {
        if(!this.ipListsRepository){
            return false;
        }
        if(0 !== key.indexOf(GameConst.LOGIN_ATTEMPTS_KEYS.ADDRESS)){
            return false;
        }
        let blockData = {
            address: key.substring(GameConst.LOGIN_ATTEMPTS_KEYS.ADDRESS.length),
            list_type: 'deny',
            reason: 'Login attempts limit reached.',
            expires_at: sc.formatDate(new Date(blockedUntil))
        };
        let storedBlock = await this.ipListsRepository.loadOne({address: blockData.address, list_type: 'deny'});
        if(!storedBlock){
            await this.ipListsRepository.create(blockData);
            return true;
        }
        if(!storedBlock.expires_at){
            return false;
        }
        await this.ipListsRepository.updateById(storedBlock.id, blockData);
        return true;
    }

    /**
     * @param {string} identity
     * @param {string} [keyPrefix]
     * @returns {string}
     */
    identityKey(identity, keyPrefix = GameConst.LOGIN_ATTEMPTS_KEYS.IDENTITY)
    {
        let identityValue = String(identity);
        if(this.maxIdentityLength < identityValue.length){
            identityValue = identityValue.substring(0, this.maxIdentityLength);
        }
        return keyPrefix+identityValue;
    }

    /**
     * @param {string} key
     * @param {number} now
     * @param {number} [windowMs]
     * @returns {number}
     */
    countHits(key, now, windowMs = 0)
    {
        if(!this.hitsByKey.has(key)){
            return 0;
        }
        let appliedWindow = windowMs || this.windowMs;
        let currentHits = this.hitsByKey.get(key).filter((hitTime) => hitTime > now - appliedWindow);
        if(0 === currentHits.length){
            this.hitsByKey.delete(key);
            this.windowByKey.delete(key);
            return 0;
        }
        this.hitsByKey.set(key, currentHits);
        return currentHits.length;
    }

    /**
     * @param {number} now
     */
    sweepExpired(now)
    {
        for(let key of [...this.hitsByKey.keys()]){
            this.countHits(key, now, this.windowByKey.get(key));
        }
        for(let key of [...this.blockedUntilByKey.keys()]){
            if(this.blockedUntilByKey.get(key) <= now){
                this.blockedUntilByKey.delete(key);
            }
        }
        this.lastSweepTime = now;
    }

    /**
     * @param {Map<string, any>} trackedKeys
     * @param {number} now
     */
    enforceCap(trackedKeys, now)
    {
        if(this.maxTrackedKeys > trackedKeys.size){
            return;
        }
        this.sweepExpired(now);
        if(this.maxTrackedKeys > trackedKeys.size){
            return;
        }
        let oldestKey = trackedKeys.keys().next().value;
        trackedKeys.delete(oldestKey);
        this.windowByKey.delete(oldestKey);
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
        if(now - this.lastSweepTime >= this.windowMs){
            this.sweepExpired(now);
        }
        let currentHits = this.countHits(key, now, windowMs);
        if(!this.hitsByKey.has(key)){
            this.enforceCap(this.hitsByKey, now);
            this.hitsByKey.set(key, []);
            this.windowByKey.set(key, windowMs || this.windowMs);
        }
        this.hitsByKey.get(key).push(now);
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
        if(!this.blockedUntilByKey.has(key)){
            this.enforceCap(this.blockedUntilByKey, now);
        }
        let blockedUntil = now + this.blockTimeMs;
        this.blockedUntilByKey.set(key, blockedUntil);
        this.hitsByKey.delete(key);
        this.windowByKey.delete(key);
        this.persistAddressBlock(key, blockedUntil).catch((error) => {
            Logger.error('The address block could not be stored: '+error.message);
        });
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
        if(!this.blockedUntilByKey.has(key)){
            return false;
        }
        if(this.blockedUntilByKey.get(key) > now){
            return true;
        }
        this.blockedUntilByKey.delete(key);
        return false;
    }

    /**
     * @param {string} identity
     * @param {string} requestAddress
     * @param {number} now
     * @returns {boolean}
     */
    isLoginBlocked(identity, requestAddress, now)
    {
        if(this.isBlocked(this.identityKey(identity), now)){
            return true;
        }
        if(!requestAddress){
            return false;
        }
        return this.isBlocked(GameConst.LOGIN_ATTEMPTS_KEYS.ADDRESS+requestAddress, now);
    }

    /**
     * @param {string} identity
     * @param {string} requestAddress
     * @param {number} now
     */
    registerLoginFailure(identity, requestAddress, now)
    {
        this.registerFailure(this.identityKey(identity), now);
        if(!requestAddress){
            return;
        }
        this.registerFailure(GameConst.LOGIN_ATTEMPTS_KEYS.ADDRESS+requestAddress, now);
    }

    /**
     * @param {string} counterKeyPrefix
     * @param {string} requestAddress
     * @param {number} maximum
     * @param {number} now
     * @param {number} [windowMs]
     * @returns {boolean}
     */
    isAddressLimitReached(counterKeyPrefix, requestAddress, maximum, now, windowMs = 0)
    {
        if(!requestAddress){
            return false;
        }
        if(0 >= maximum){
            return false;
        }
        return maximum < this.registerHit(counterKeyPrefix+requestAddress, now, windowMs);
    }

    /**
     * @param {string} key
     */
    clear(key)
    {
        this.hitsByKey.delete(key);
        this.windowByKey.delete(key);
        this.blockedUntilByKey.delete(key);
    }

    reset()
    {
        this.hitsByKey = new Map();
        this.windowByKey = new Map();
        this.blockedUntilByKey = new Map();
        this.lastSweepTime = 0;
    }

}

module.exports.LoginAttempts = LoginAttempts;
