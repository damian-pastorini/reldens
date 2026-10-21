/**
 *
 * Reldens - PasswordValidationGuard
 *
 * Shared by the game and the administration panel logins: caps the password validations running at the same time, so
 * the concurrent logins can not exhaust the server, and rejects the stored identities blocked by the login attempts,
 * running a dummy password validation so a blocked login takes the same time as a wrong password.
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

}

module.exports.PasswordValidationGuard = PasswordValidationGuard;
