/**
 *
 * Reldens - LoginManager
 *
 * Manages the user authentication flows: the game login, the guest login and the administration panel login. Handles
 * the user validation, the login attempts blocks, the player state relation and the selected scene on login. Creates
 * and exposes the user registration, the player creation, the forgot password and the user disconnection between
 * rooms and servers. Integrates with ConfigManager, UsersManager, RoomsManager, and Mailer. Listens to events for
 * custom authentication hooks.
 *
 */

const { ActivePlayers } = require('./memory/active-players');
const { LoginAttempts } = require('./memory/login-attempts');
const { ExpiringHmacToken } = require('./expiring-hmac-token');
const { UserDisconnection } = require('./user-disconnection');
const { UserRegistration } = require('./user-registration');
const { PlayerRoomState } = require('./player-room-state');
const { PlayerCreation } = require('./player-creation');
const { ForgotPassword } = require('./forgot-password');
const { RoomsConst } = require('../../rooms/constants');
const { GameConst } = require('../constants');
const { Encryptor } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('express').Application} ExpressApplication
 * @typedef {import('http').Server} HttpServer
 * @typedef {import('https').Server} HttpsServer
 *
 * @typedef {Object} LoginManagerProps
 * @property {ConfigManager} config
 * @property {UsersManager} usersManager
 * @property {RoomsManager} roomsManager
 * @property {ExpressApplication|HttpServer|HttpsServer} appServer
 * @property {Mailer} mailer
 * @property {ThemeManager} themeManager
 * @property {EventsManager} [events]
 */
class LoginManager
{

    /**
     * @param {LoginManagerProps} props
     */
    constructor(props)
    {
        /** @type {ConfigManager} */
        this.config = props.config;
        /** @type {UsersManager} */
        this.usersManager = props.usersManager;
        /** @type {RoomsManager} */
        this.roomsManager = props.roomsManager;
        /** @type {Encryptor} */
        this.passwordManager = Encryptor;
        /** @type {ExpressApplication|HttpServer|HttpsServer} */
        this.appServer = props.appServer;
        /** @type {Mailer} */
        this.mailer = props.mailer;
        /** @type {EventsManager|false} */
        this.events = sc.get(props, 'events', false);
        this.listenEvents();
        /** @type {number} */
        this.guestRoleId = Number(this.config.getWithoutLogs('server/players/guestUser/roleId', 0));
        /** @type {typeof ActivePlayers} */
        this.activePlayers = ActivePlayers;
        this.activePlayers.guestRoleId = this.guestRoleId;
        /** @type {number} */
        this.pendingPasswordValidations = 0;
        /** @type {number} */
        this.maxPendingPasswordValidations = Number(
            this.config.getWithoutLogs('server/security/maxConcurrentPasswordValidations', 8)
        );
        /** @type {LoginAttempts} */
        this.loginAttempts = new LoginAttempts({
            ...this.config.getWithoutLogs('server/security/loginAttempts', {}),
            ipListsRepository: sc.get(props, 'ipListsRepository', false)
        });
        /** @type {ExpiringHmacToken} */
        this.expiringHmacToken = new ExpiringHmacToken({
            secret: this.config.getWithoutLogs('server/security/signedTokensSecret', '')
        });
        /** @type {PlayerRoomState} */
        this.playerRoomState = new PlayerRoomState({config: this.config, roomsManager: this.roomsManager});
        /** @type {UserDisconnection} */
        this.userDisconnection = new UserDisconnection({
            config: this.config,
            roomsManager: this.roomsManager,
            activePlayers: this.activePlayers,
            expiringHmacToken: this.expiringHmacToken
        });
        /** @type {UserRegistration} */
        this.userRegistration = new UserRegistration({
            config: this.config,
            usersManager: this.usersManager,
            events: this.events,
            passwordManager: this.passwordManager,
            loginAttempts: this.loginAttempts,
            logUserData: this.logUserData.bind(this)
        });
        /** @type {PlayerCreation} */
        this.playerCreation = new PlayerCreation({
            config: this.config,
            usersManager: this.usersManager,
            roomsManager: this.roomsManager,
            events: this.events,
            playerRoomState: this.playerRoomState
        });
        /** @type {ForgotPassword} */
        this.forgotPassword = new ForgotPassword({
            config: this.config,
            mailer: this.mailer,
            usersManager: this.usersManager,
            themeManager: props.themeManager,
            events: this.events,
            loginAttempts: this.loginAttempts,
            expiringHmacToken: this.expiringHmacToken,
            passwordManager: this.passwordManager
        });
    }

    /**
     * @returns {boolean}
     */
    listenEvents()
    {
        if(!this.events){
            Logger.error('EventsManager undefined in LoginManager.');
            return false;
        }
        this.events.on('reldens.serverBeforeListen', async (props) => {
            await props.serverManager.app.post(
                GameConst.ROUTE_PATHS.DISCONNECT_USER,
                this.handleDisconnectUserRequest.bind(this)
            );
            // @TODO - BETA - Refactor, move into the initial request data and avoid the extra requests from the client.
            await props.serverManager.app.get(GameConst.ROUTE_PATHS.MAILER, async (req, res) => {
                res.json({
                    enabled: this.mailer?.isEnabled()
                });
            });
            props.serverManager.app.get(GameConst.ROUTE_PATHS.TERMS_AND_CONDITIONS, (req, res) => {
                let languageParam = req.query.lang || '';
                let termsConfig = this.config.getWithoutLogs(
                    'client/login/termsAndConditions/'+languageParam,
                    this.config.getWithoutLogs(
                        'client/login/termsAndConditions',
                        {}
                    )
                );
                res.json({
                    link: sc.get(termsConfig, 'link', ''),
                    heading: sc.get(termsConfig, 'heading', ''),
                    body: sc.get(termsConfig, 'body', ''),
                    checkboxLabel: sc.get(termsConfig, 'checkboxLabel', '')
                });
            });
            this.forgotPassword.defineResetPasswordRoutes(props.serverManager.app);
        });
        return true;
    }

    /**
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<Object>}
     */
    async handleDisconnectUserRequest(req, res)
    {
        try {
            return res.json({isSuccess: await this.userDisconnection.disconnectUserByLoginData(req)});
        } catch (error) {
            Logger.error('Disconnect user request error.', error.message);
            return res.status(500).json({isSuccess: false});
        }
    }

    /**
     * @param {Object<string, any>|false} [userData=false]
     * @returns {Promise<Object<string, any>>}
     */
    async processUserRequest(userData = false, requestAddress = '')
    {
        if(sc.hasOwn(userData, 'forgot')){
            return await this.forgotPassword.processForgotPassword(userData, requestAddress);
        }
        this.events.emitSync('reldens.processUserRequestIsValidDataBefore', this, userData);
        let result = {error: GameConst.INVALID_LOGIN_MESSAGE};
        if(!this.hasValidUserName(userData)){
            Logger.debug('Missing username.', this.logUserData(userData));
            this.events.emitSync('reldens.invalidData', this, userData, result);
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
        if(this.maxPendingPasswordValidations <= this.pendingPasswordValidations){
            Logger.warning('Password validations limit reached, login request rejected.', {user: userData.username});
            return result;
        }
        let user = await this.usersManager.loadUserByUsername(userData.username);
        if(user){
            return await this.login(user, userData, requestAddress, now);
        }
        if(!userData.isNewUser){
            await this.validatePassword(userData.password, GameConst.DUMMY_PASSWORD_HASH);
            Logger.info('Invalid user login data.', {user: userData.username});
            this.events.emitSync('reldens.loginInvalidParams', this, user, userData, result);
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
     * @param {Object} userModel
     * @returns {boolean}
     */
    isGuestUser(userModel)
    {
        if(0 === this.guestRoleId){
            return false;
        }
        return this.guestRoleId === Number(sc.get(userModel, 'role_id', 0));
    }

    /**
     * @param {string} password
     * @param {string} storedPassword
     * @returns {Promise<boolean>}
     */
    async validatePassword(password, storedPassword)
    {
        this.pendingPasswordValidations++;
        try {
            return await this.passwordManager.validatePassword(password, storedPassword);
        } finally {
            this.pendingPasswordValidations--;
        }
    }

    /**
     * @param {Object<string, any>} userData
     * @returns {Object<string, any>}
     */
    logUserData(userData)
    {
        if(!userData){
            return {user: {}};
        }
        return {user: sc.pickProps(userData, GameConst.LOGGABLE_USER_DATA_PROPERTIES)};
    }

    /**
     * @param {Object} user
     */
    mapPlayerStateRelation(user)
    {
        if(!sc.isArray(user.related_players)){
            return;
        }
        for(let player of user.related_players){
            if(player.related_players_state && !player.state){
                player.state = player.related_players_state;
            }
        }
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
        // check guest user:
        if(!this.isValidGuestLogin(userData, user)){
            await this.validatePassword(userData.password, GameConst.DUMMY_PASSWORD_HASH);
            Logger.error('Guest user is not active for login.', this.logUserData(userData));
            this.events.emitSync('reldens.loginInvalidRole', this, user, userData, result);
            this.loginAttempts.registerLoginFailure(userData.username, requestAddress, attemptTime);
            return result;
        }
        if(GameConst.BANNED_USER_STATUS === String(user.status)){
            await this.validatePassword(userData.password, GameConst.DUMMY_PASSWORD_HASH);
            Logger.warning('Banned user login attempt.', {user: userData.username});
            this.events.emitSync('reldens.loginBannedUser', this, user, userData, result);
            return result;
        }
        // check if the passwords match:
        if(!await this.isValidLoginPassword(user, userData)){
            Logger.error('Invalid password for user login.', this.logUserData(userData));
            this.events.emitSync('reldens.loginInvalidPassword', this, user, userData, result);
            this.loginAttempts.registerLoginFailure(userData.username, requestAddress, attemptTime);
            return result;
        }
        this.loginAttempts.clear(this.loginAttempts.identityKey(userData.username));
        try {
            if(sc.isArray(user.related_players) && 0 < user.related_players.length){
                this.mapPlayerStateRelation(user);
                // set the scene on the user players:
                this.events.emitSync('reldens.setSceneOnPlayers', this, user, userData);
                await this.setSceneOnPlayers(user, userData);
            }
            let result = {user: user};
            this.events.emitSync('reldens.loginSuccess', this, user, userData, result);
            return result;
        } catch (error) {
            Logger.error('Login try/catch error.', error, this.logUserData(userData));
            this.events.emitSync('reldens.loginError', this, user, userData, result);
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
        if(await this.validatePassword(userData.password, user.password)){
            return true;
        }
        let passwordValidation = {loginManager: this, user, userData, isValid: false};
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

    /**
     * @param {Object} user
     * @param {Object<string, any>} userData
     * @returns {Promise<void>}
     */
    async setSceneOnPlayers(user, userData)
    {
        for(let player of user.related_players){
            //Logger.debug('Player state:', player);
            if(!player.state){
                continue;
            }
            let config = this.config.get('client/rooms/selection');
            if(
                config.allowOnLogin
                && userData['selectedScene']
                && userData['selectedScene'] !== RoomsConst.ROOM_LAST_LOCATION_KEY
                && this.roomsManager.loginAvailableRooms.some(room => room.name === userData['selectedScene'])
            ){
                await this.applySelectedLocation(player, userData['selectedScene']);
            }
            //Logger.debug('Get room name by ID. Player state:', player.state);
            player.state.scene = await this.playerRoomState.getRoomNameById(player.state.room_id);
        }
    }

    /**
     * @param {string} email
     * @param {string} password
     * @param {number} [roleId=0]
     * @returns {Promise<Object|false>}
     */
    async roleAuthenticationCallback(email, password, roleId = 0, requestAddress = '')
    {
        let now = Date.now();
        if(this.loginAttempts.isLoginBlocked(email, requestAddress, now)){
            Logger.warning('Blocked administration panel login attempt.', {email});
            return false;
        }
        if(this.maxPendingPasswordValidations <= this.pendingPasswordValidations){
            Logger.warning('Password validations limit reached, administration login rejected.', {email});
            return false;
        }
        let user = await this.usersManager.loadUserByEmail(email);
        if(!user || (0 !== roleId && String(user.role_id) !== String(roleId))){
            await this.validatePassword(password, GameConst.DUMMY_PASSWORD_HASH);
            this.loginAttempts.registerLoginFailure(email, requestAddress, now);
            return false;
        }
        if(GameConst.BANNED_USER_STATUS === String(user.status)){
            await this.validatePassword(password, GameConst.DUMMY_PASSWORD_HASH);
            Logger.warning('Banned administrator login attempt.', {email});
            return false;
        }
        if(!await this.validatePassword(password, user.password)){
            this.loginAttempts.registerLoginFailure(email, requestAddress, now);
            return false;
        }
        this.loginAttempts.clear(this.loginAttempts.identityKey(email));
        user.sessionRevision = Encryptor.hashData(user.password);
        return user;
    }

    /**
     * @param {Object} player
     * @param {string} selectedScene
     * @returns {Promise<boolean|void>}
     */
    async applySelectedLocation(player, selectedScene)
    {
        let selectedRoom = await this.roomsManager.loadRoomByName(selectedScene);
        if(!selectedRoom){
            return false;
        }
        player.state = this.playerRoomState.getStateObjectFromRoom(selectedRoom);
    }

    /**
     * @param {Object} userModel
     * @returns {Promise<boolean>}
     */
    async updateLastLogin(userModel)
    {
        let updated = await this.usersManager.updateUserLastLogin(userModel);
        if(!updated){
            // @TODO - BETA - Logout user.
            Logger.error('Last login update fail on user with ID "'+userModel.id+'".');
        }
        return updated;
    }

}

module.exports.LoginManager = LoginManager;
