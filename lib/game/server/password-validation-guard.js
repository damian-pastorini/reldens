/**
 *
 * Reldens - PasswordValidationGuard
 *
 * The login checks shared by the game and the administration panel logins: the blocked identity and address requests,
 * the cap of the password validations running at the same time, so the concurrent logins can not exhaust the server,
 * the blocked stored identities, the banned users, the rejected logins with the failure registered and the password
 * result that registers the failure or clears the attempts. Every rejection runs a dummy password validation so it
 * takes the same time as a wrong password.
 *
 */

const { GameConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {Object} PasswordValidationGuardProps
 * @property {Encryptor} passwordManager
 * @property {LoginAttempts} loginAttempts
 * @property {number} [maxPendingValidations]
 */
class PasswordValidationGuard
{

    /**
     * @param {PasswordValidationGuardProps} props
     */
    constructor(props)
    {
        /** @type {Encryptor} */
        this.passwordManager = props.passwordManager;
        /** @type {LoginAttempts} */
        this.loginAttempts = props.loginAttempts;
        /** @type {number} */
        this.pendingValidations = 0;
        /** @type {number} */
        this.maxPendingValidations = Number(sc.get(props, 'maxPendingValidations', 8));
    }

    /**
     * @param {string} identity
     * @param {string} requestAddress
     * @param {number} now
     * @param {string} blockedMessage
     * @returns {boolean}
     */
    isRequestBlocked(identity, requestAddress, now, blockedMessage)
    {
        if(!this.loginAttempts.isLoginBlocked(identity, requestAddress, now)){
            return false;
        }
        Logger.warning(blockedMessage, {identity});
        return true;
    }

    /**
     * @param {{limit: string, error: string}} messages
     * @param {string} identity
     * @param {function(): Promise<any>} reservedValidation
     * @param {any} rejectedResult
     * @returns {Promise<any>}
     */
    async runReserved(messages, identity, reservedValidation, rejectedResult)
    {
        if(this.maxPendingValidations <= this.pendingValidations){
            Logger.warning(messages.limit, {identity});
            return rejectedResult;
        }
        this.pendingValidations++;
        let validationResult = await reservedValidation().catch((error) => {
            Logger.error(messages.error, {identity, error: error.message});
            return rejectedResult;
        });
        this.pendingValidations--;
        return validationResult;
    }

    /**
     * @param {string} storedIdentity
     * @param {string} password
     * @param {number} now
     * @returns {Promise<boolean>}
     */
    async isStoredIdentityBlocked(storedIdentity, password, now)
    {
        if(!this.loginAttempts.isBlocked(this.loginAttempts.identityKey(storedIdentity), now)){
            return false;
        }
        await this.passwordManager.validatePassword(password, GameConst.DUMMY_PASSWORD_HASH);
        Logger.warning('Blocked login attempt.', {identity: storedIdentity});
        return true;
    }

    /**
     * @param {string|number} userStatus
     * @param {string} password
     * @param {string} bannedMessage
     * @param {string} identity
     * @returns {Promise<boolean>}
     */
    async isBannedUser(userStatus, password, bannedMessage, identity)
    {
        if(GameConst.BANNED_USER_STATUS !== String(userStatus)){
            return false;
        }
        await this.passwordManager.validatePassword(password, GameConst.DUMMY_PASSWORD_HASH);
        Logger.warning(bannedMessage, {identity});
        return true;
    }

    /**
     * @param {string} identity
     * @param {string} password
     * @param {string} requestAddress
     * @param {number} now
     * @returns {Promise<boolean>}
     */
    async rejectWithFailure(identity, password, requestAddress, now)
    {
        await this.passwordManager.validatePassword(password, GameConst.DUMMY_PASSWORD_HASH);
        this.loginAttempts.registerLoginFailure(identity, requestAddress, now);
        return false;
    }

    /**
     * @param {boolean} isValidPassword
     * @param {string} storedIdentity
     * @param {string} requestAddress
     * @param {number} now
     * @returns {boolean}
     */
    registerPasswordResult(isValidPassword, storedIdentity, requestAddress, now)
    {
        if(!isValidPassword){
            this.loginAttempts.registerLoginFailure(storedIdentity, requestAddress, now);
            return false;
        }
        this.loginAttempts.clear(this.loginAttempts.identityKey(storedIdentity));
        return true;
    }

}

module.exports.PasswordValidationGuard = PasswordValidationGuard;
