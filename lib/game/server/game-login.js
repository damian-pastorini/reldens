/**
 *
 * Reldens - GameLogin
 *
 * Runs the game and guest login requests: sends the forgot password requests and the new guests to their flows,
 * validates the username, rejects the blocked identities and addresses, loads the user inside a reserved password
 * validation, registers the failed logins and sets the players state and scene on a valid login. The login events
 * receive the LoginManager as their first argument.
 *
 */

const { GameConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {Object} GameLoginProps
 * @property {ConfigManager} config
 * @property {EventsManager} events
 * @property {LoginManager} loginManager
 * @property {UsersManager} usersManager
 * @property {typeof ActivePlayers} activePlayers
 * @property {PlayerRoomState} playerRoomState
 * @property {UserRegistration} userRegistration
 * @property {ForgotPassword} forgotPassword
 * @property {Encryptor} passwordManager
 * @property {LoginAttempts} loginAttempts
 * @property {PasswordValidationGuard} passwordValidationGuard
 * @property {function(Object<string, any>): Object<string, any>} logUserData
 */
class GameLogin
{

    /**
     * @param {GameLoginProps} props
     */
    constructor(props)
    {
        /** @type {ConfigManager} */
        this.config = props.config;
        /** @type {EventsManager} */
        this.events = props.events;
        /** @type {LoginManager} */
        this.loginManager = props.loginManager;
        /** @type {UsersManager} */
        this.usersManager = props.usersManager;
        /** @type {typeof ActivePlayers} */
        this.activePlayers = props.activePlayers;
        /** @type {PlayerRoomState} */
        this.playerRoomState = props.playerRoomState;
        /** @type {UserRegistration} */
        this.userRegistration = props.userRegistration;
        /** @type {ForgotPassword} */
        this.forgotPassword = props.forgotPassword;
        /** @type {Encryptor} */
        this.passwordManager = props.passwordManager;
        /** @type {LoginAttempts} */
        this.loginAttempts = props.loginAttempts;
        /** @type {PasswordValidationGuard} */
        this.passwordValidationGuard = props.passwordValidationGuard;
        /** @type {function(Object<string, any>): Object<string, any>} */
        this.logUserData = props.logUserData;
    }

    /**
     * @param {Object<string, any>|false} [userData=false]
     * @param {string} [requestAddress]
     * @returns {Promise<Object<string, any>>}
     */
    async processUserRequest(userData = false, requestAddress = '')
    {
        if(sc.hasOwn(userData, 'forgot')){
            return await this.forgotPassword.processForgotPassword(userData, requestAddress);
        }
        this.events.emitSync('reldens.processUserRequestIsValidDataBefore', this.loginManager, userData);
        let result = {error: GameConst.INVALID_LOGIN_MESSAGE};
        if(!this.hasValidUserName(userData)){
            Logger.debug('Missing username.', this.logUserData(userData));
            this.events.emitSync('reldens.invalidData', this.loginManager, userData, result);
            return result;
        }
        let now = Date.now();
        if(this.loginAttempts.isLoginBlocked(userData.username, requestAddress, now)){
            Logger.warning('Blocked login attempt.', {user: userData.username});
            return result;
        }
        if(userData.isGuest && userData.isNewUser){
            return await this.userRegistration.processGuestRequest(userData, requestAddress, now, result);
        }
        return await this.passwordValidationGuard.runReserved(
            {limit: 'Password validations limit reached, login request rejected.', error: 'Login request error.'},
            userData.username,
            () => this.processReservedUserRequest(userData, requestAddress, now, result),
            result
        );
    }

    /**
     * @param {Object<string, any>} userData
     * @param {string} requestAddress
     * @param {number} now
     * @param {Object<string, any>} result
     * @returns {Promise<Object<string, any>>}
     */
    async processReservedUserRequest(userData, requestAddress, now, result)
    {
        let user = await this.usersManager.loadUserByUsername(userData.username);
        if(user){
            return await this.login(user, userData, requestAddress, now);
        }
        if(!userData.isNewUser){
            await this.passwordManager.validatePassword(userData.password, GameConst.DUMMY_PASSWORD_HASH);
            Logger.info('Invalid user login data.', {user: userData.username});
            this.events.emitSync('reldens.loginInvalidParams', this.loginManager, user, userData, result);
            this.loginAttempts.registerLoginFailure(userData.username, requestAddress, now);
        }
        if(userData.isNewUser){
            return await this.userRegistration.processRegistrationRequest(userData, requestAddress, now, result);
        }
        return result;
    }

    /**
     * @param {Object<string, any>} userData
     * @returns {boolean}
     */
    hasValidUserName(userData)
    {
        if(!sc.hasOwn(userData, 'username')){
            return false;
        }
        if(!sc.isString(userData.username)){
            return false;
        }
        return 0 < userData.username.length;
    }

    /**
     * @param {Object} user
     * @param {Object<string, any>} userData
     * @param {string} [requestAddress]
     * @param {number} [now]
     * @returns {Promise<Object<string, any>>}
     */
    async login(user, userData, requestAddress = '', now = 0)
    {
        let result = {error: GameConst.INVALID_LOGIN_MESSAGE};
        let attemptTime = now || Date.now();
        if(await this.passwordValidationGuard.isStoredIdentityBlocked(user.username, userData.password, attemptTime)){
            return result;
        }
        if(!this.isValidGuestLogin(userData, user)){
            await this.passwordManager.validatePassword(userData.password, GameConst.DUMMY_PASSWORD_HASH);
            Logger.error('Guest user is not active for login.', this.logUserData(userData));
            this.events.emitSync('reldens.loginInvalidRole', this.loginManager, user, userData, result);
            this.loginAttempts.registerLoginFailure(user.username, requestAddress, attemptTime);
            return result;
        }
        if(GameConst.BANNED_USER_STATUS === String(user.status)){
            await this.passwordManager.validatePassword(userData.password, GameConst.DUMMY_PASSWORD_HASH);
            Logger.warning('Banned user login attempt.', {user: userData.username});
            this.events.emitSync('reldens.loginBannedUser', this.loginManager, user, userData, result);
            return result;
        }
        if(!await this.isValidLoginPassword(user, userData)){
            Logger.error('Invalid password for user login.', this.logUserData(userData));
            this.events.emitSync('reldens.loginInvalidPassword', this.loginManager, user, userData, result);
            this.loginAttempts.registerLoginFailure(user.username, requestAddress, attemptTime);
            return result;
        }
        this.loginAttempts.clear(this.loginAttempts.identityKey(user.username));
        try {
            if(sc.isArray(user.related_players) && 0 < user.related_players.length){
                this.playerRoomState.mapPlayerStateRelation(user.related_players);
                this.events.emitSync('reldens.setSceneOnPlayers', this.loginManager, user, userData);
                await this.playerRoomState.setSceneOnPlayers(user.related_players, userData.selectedScene);
            }
            let result = {user: user};
            this.events.emitSync('reldens.loginSuccess', this.loginManager, user, userData, result);
            return result;
        } catch (error) {
            Logger.error('Login try/catch error.', error, this.logUserData(userData));
            this.events.emitSync('reldens.loginError', this.loginManager, user, userData, result);
            return result;
        }
    }

    /**
     * @param {Object} user
     * @param {Object<string, any>} userData
     * @returns {Promise<boolean>}
     */
    async isValidLoginPassword(user, userData)
    {
        if(await this.passwordManager.validatePassword(userData.password, user.password)){
            return true;
        }
        let passwordValidation = {loginManager: this.loginManager, user, userData, isValid: false};
        await this.events.emit('reldens.loginPasswordValidationFallback', passwordValidation);
        return passwordValidation.isValid;
    }

    /**
     * @param {Object<string, any>} userData
     * @param {Object} user
     * @returns {boolean}
     */
    isValidGuestLogin(userData, user)
    {
        let guestRoleId = this.config.server?.players?.guestUser?.roleId || 0;
        if(0 === guestRoleId){
            Logger.warning('Guest role ID is not defined by configuration.');
            return true;
        }
        if(!userData.isGuest && user.role_id !== guestRoleId){
            return true;
        }
        return Boolean(this.activePlayers.fetchByRoomAndUserName(user.username, this.activePlayers.gameRoomInstanceId));
    }

}

module.exports.GameLogin = GameLogin;
