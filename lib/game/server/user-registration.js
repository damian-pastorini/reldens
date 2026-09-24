/**
 *
 * Reldens - UserRegistration
 *
 * Registers the new accounts and the guest accounts: applies the registration and guests limits per address and the
 * password policy, generates the guest credentials and creates the user with the configured role and status.
 *
 */

const { PasswordPolicy } = require('../../users/password-policy');
const { GameConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {Object} UserRegistrationProps
 * @property {ConfigManager} config
 * @property {UsersManager} usersManager
 * @property {EventsManager} events
 * @property {Encryptor} passwordManager
 * @property {LoginAttempts} loginAttempts
 * @property {function(Object<string, any>): Object<string, any>} logUserData
 */
class UserRegistration
{

    /**
     * @param {UserRegistrationProps} props
     */
    constructor(props)
    {
        /** @type {ConfigManager} */
        this.config = props.config;
        /** @type {UsersManager} */
        this.usersManager = props.usersManager;
        /** @type {EventsManager} */
        this.events = props.events;
        /** @type {Encryptor} */
        this.passwordManager = props.passwordManager;
        /** @type {LoginAttempts} */
        this.loginAttempts = props.loginAttempts;
        /** @type {function(Object<string, any>): Object<string, any>} */
        this.logUserData = props.logUserData;
        /** @type {string} */
        this.guestEmailDomain = this.config.getWithoutLogs('server/players/guestsUser/emailDomain');
        /** @type {boolean} */
        this.allowGuestUserName = this.config.getWithoutLogs('client/general/users/allowGuestUserName', false);
        /** @type {number} */
        this.passwordMinimumLength = PasswordPolicy.fetchMinimumLength(this.config);
        /** @type {number} */
        this.registrationMaxPerIp = this.config.getWithoutLogs('server/security/registration/maxPerIp', 10);
        /** @type {number} */
        this.guestsMaxPerIp = this.config.getWithoutLogs('server/security/guests/maxPerIp', 20);
    }

    /**
     * @param {Object<string, any>} userData
     * @param {string} requestAddress
     * @param {number} now
     * @param {Object<string, any>} result
     * @returns {Promise<Object<string, any>>}
     */
    async processGuestRequest(userData, requestAddress, now, result)
    {
        let guestsKey = GameConst.LOGIN_ATTEMPTS_KEYS.GUESTS;
        if(this.loginAttempts.isAddressLimitReached(guestsKey, requestAddress, this.guestsMaxPerIp, now)){
            Logger.warning('Guests creation limit reached for the request address.');
            return result;
        }
        return await this.register(this.overrideWithGuestData(userData));
    }

    /**
     * @param {Object<string, any>} userData
     * @param {string} requestAddress
     * @param {number} now
     * @param {Object<string, any>} result
     * @returns {Promise<Object<string, any>>}
     */
    async processRegistrationRequest(userData, requestAddress, now, result)
    {
        let user = await this.usersManager.loadUserByEmail(userData.email);
        if(user){
            Logger.info('User already exists.', this.logUserData(userData));
            this.events.emitSync('reldens.registrationInvalidParams', this, user, userData, result);
            this.loginAttempts.registerLoginFailure(userData.username, requestAddress, now);
            return result;
        }
        let registrationKey = GameConst.LOGIN_ATTEMPTS_KEYS.REGISTRATION;
        if(this.loginAttempts.isAddressLimitReached(registrationKey, requestAddress, this.registrationMaxPerIp, now)){
            Logger.warning('Registration limit reached for the request address.');
            return result;
        }
        if(!PasswordPolicy.isValid(userData.password, this.passwordMinimumLength)){
            Logger.info('Invalid registration password.', this.logUserData(userData));
            this.events.emitSync('reldens.registrationInvalidPassword', this, userData, result);
            return result;
        }
        return await this.register(userData);
    }

    /**
     * @param {Object<string, any>} userData
     * @returns {Object<string, any>}
     */
    overrideWithGuestData(userData)
    {
        let generatedGuestName = 'guest-'+sc.getTime()+'-'+sc.randomChars(8);
        userData.username = this.allowGuestUserName
            ? generatedGuestName+'-'+String(userData.username).replace(/[^a-zA-Z0-9-]/g, '').substring(0, 20)
            : generatedGuestName;
        userData.email = userData.username+this.guestEmailDomain;
        userData.password = sc.randomChars(12);
        return userData;
    }

    /**
     * @param {Object<string, any>} userData
     * @returns {Promise<Object<string, any>>}
     */
    async register(userData)
    {
        let result = {error: GameConst.INVALID_LOGIN_MESSAGE};
        if(!userData.isNewUser){
            Logger.error('Registration invalid parameters.', this.logUserData(userData));
            await this.events.emit('reldens.register', this, userData, result);
            return result;
        }
        try {
            let defaultRoleId = this.config.server.players.initialUser.roleId;
            let roleId = !userData.isGuest ? defaultRoleId : this.config.server.players.guestUser.roleId;
            let newUser = await this.usersManager.createUser({
                email: userData.email,
                username: userData.username,
                password: this.passwordManager.encryptPassword(userData.password),
                role_id: roleId,
                status: this.config.server.players.initialUser.status
            });
            let result = {user: newUser};
            await this.events.emit('reldens.createNewUserAfter', newUser, this, result);
            return result;
        } catch (error) {
            Logger.error('Registration try/catch error.', error, this.logUserData(userData));
            await this.events.emit('reldens.createNewUserError', this, userData, result);
            return result;
        }
    }

}

module.exports.UserRegistration = UserRegistration;
