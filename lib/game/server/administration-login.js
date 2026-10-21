/**
 *
 * Reldens - AdministrationLogin
 *
 * Authenticates the administration panel logins: rejects the blocked emails and addresses, loads the user by email
 * inside a reserved password validation, checks the role, the stored email block, the ban and the password, registers
 * the failed logins and returns the user with the session revision built from its password hash.
 *
 */

const { GameConst } = require('../constants');
const { Encryptor } = require('@reldens/server-utils');
const { Logger } = require('@reldens/utils');

/**
 * @typedef {Object} AdministrationLoginProps
 * @property {UsersManager} usersManager
 * @property {Encryptor} passwordManager
 * @property {LoginAttempts} loginAttempts
 * @property {PasswordValidationGuard} passwordValidationGuard
 */
class AdministrationLogin
{

    /**
     * @param {AdministrationLoginProps} props
     */
    constructor(props)
    {
        /** @type {UsersManager} */
        this.usersManager = props.usersManager;
        /** @type {Encryptor} */
        this.passwordManager = props.passwordManager;
        /** @type {LoginAttempts} */
        this.loginAttempts = props.loginAttempts;
        /** @type {PasswordValidationGuard} */
        this.passwordValidationGuard = props.passwordValidationGuard;
    }

    /**
     * @param {string} email
     * @param {string} password
     * @param {number} [roleId=0]
     * @param {string} [requestAddress]
     * @returns {Promise<Object|false>}
     */
    async roleAuthenticationCallback(email, password, roleId = 0, requestAddress = '')
    {
        let now = Date.now();
        if(this.loginAttempts.isLoginBlocked(email, requestAddress, now)){
            Logger.warning('Blocked administration panel login attempt.', {email});
            return false;
        }
        return await this.passwordValidationGuard.runReserved(
            {
                limit: 'Password validations limit reached, administration login rejected.',
                error: 'Administration login error.'
            },
            email,
            () => this.authenticateReservedRoleUser(email, password, roleId, requestAddress, now),
            false
        );
    }

    /**
     * @param {string} email
     * @param {string} password
     * @param {number} roleId
     * @param {string} requestAddress
     * @param {number} now
     * @returns {Promise<Object|false>}
     */
    async authenticateReservedRoleUser(email, password, roleId, requestAddress, now)
    {
        let user = await this.usersManager.loadUserByEmail(email);
        if(!user || (0 !== roleId && String(user.role_id) !== String(roleId))){
            await this.passwordManager.validatePassword(password, GameConst.DUMMY_PASSWORD_HASH);
            this.loginAttempts.registerLoginFailure(email, requestAddress, now);
            return false;
        }
        if(await this.passwordValidationGuard.isStoredIdentityBlocked(user.email, password, now)){
            return false;
        }
        if(GameConst.BANNED_USER_STATUS === String(user.status)){
            await this.passwordManager.validatePassword(password, GameConst.DUMMY_PASSWORD_HASH);
            Logger.warning('Banned administrator login attempt.', {email});
            return false;
        }
        if(!await this.passwordManager.validatePassword(password, user.password)){
            this.loginAttempts.registerLoginFailure(user.email, requestAddress, now);
            return false;
        }
        this.loginAttempts.clear(this.loginAttempts.identityKey(user.email));
        user.sessionRevision = Encryptor.hashData(user.password);
        return user;
    }

}

module.exports.AdministrationLogin = AdministrationLogin;
