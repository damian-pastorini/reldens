/**
 *
 * Reldens - AdministrationLogin
 *
 * Authenticates the administration panel logins: rejects the blocked emails and addresses, loads the user by email
 * inside a reserved password validation, checks the role, the stored email block, the ban and the password, registers
 * the failed logins and returns the user with the session revision built from its password hash. The shared login
 * checks are run by the PasswordValidationGuard.
 *
 */

const { Encryptor } = require('@reldens/server-utils');

/**
 * @typedef {Object} AdministrationLoginProps
 * @property {UsersManager} usersManager
 * @property {Encryptor} passwordManager
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
        let isRequestBlocked = this.passwordValidationGuard.isRequestBlocked(
            email,
            requestAddress,
            now,
            'Blocked administration panel login attempt.'
        );
        if(isRequestBlocked){
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
            return await this.passwordValidationGuard.rejectWithFailure(email, password, requestAddress, now);
        }
        if(await this.passwordValidationGuard.isStoredIdentityBlocked(user.email, password, now)){
            return false;
        }
        let isBannedUser = await this.passwordValidationGuard.isBannedUser(
            user.status,
            password,
            'Banned administrator login attempt.',
            email
        );
        if(isBannedUser){
            return false;
        }
        let isValidPassword = await this.passwordManager.validatePassword(password, user.password);
        if(!this.passwordValidationGuard.registerPasswordResult(isValidPassword, user.email, requestAddress, now)){
            return false;
        }
        user.sessionRevision = Encryptor.hashData(user.password);
        return user;
    }

}

module.exports.AdministrationLogin = AdministrationLogin;
