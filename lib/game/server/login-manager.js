/**
 *
 * Reldens - LoginManager
 *
 * Creates and exposes the user authentication flows: the game and guest login (GameLogin) and the administration panel
 * login (AdministrationLogin), which share the login attempts and the password validations guard. Creates and exposes
 * the user registration, the player creation, the forgot password and the user disconnection between rooms and
 * servers, and registers the login related routes. Integrates with ConfigManager, UsersManager, RoomsManager, and
 * Mailer. The login events receive this manager as their first argument.
 *
 */

const { ActivePlayers } = require('./memory/active-players');
const { LoginAttempts } = require('./memory/login-attempts');
const { PasswordValidationGuard } = require('./password-validation-guard');
const { AdministrationLogin } = require('./administration-login');
const { ExpiringHmacToken } = require('./expiring-hmac-token');
const { UserDisconnection } = require('./user-disconnection');
const { UserRegistration } = require('./user-registration');
const { PlayerRoomState } = require('./player-room-state');
const { PlayerCreation } = require('./player-creation');
const { ForgotPassword } = require('./forgot-password');
const { GameLogin } = require('./game-login');
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
 * @property {function(string): string} [addressKeyGenerator]
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
        /** @type {LoginAttempts} */
        this.loginAttempts = new LoginAttempts({
            ...this.config.getWithoutLogs('server/security/loginAttempts', {}),
            ipListsRepository: sc.get(props, 'ipListsRepository', false),
            addressKeyGenerator: sc.get(props, 'addressKeyGenerator', false)
        });
        /** @type {PasswordValidationGuard} */
        this.passwordValidationGuard = new PasswordValidationGuard({
            passwordManager: this.passwordManager,
            loginAttempts: this.loginAttempts,
            maxPendingValidations: this.config.getWithoutLogs('server/security/maxConcurrentPasswordValidations', 8)
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
        /** @type {GameLogin} */
        this.gameLogin = new GameLogin({
            config: this.config,
            events: this.events,
            loginManager: this,
            usersManager: this.usersManager,
            activePlayers: this.activePlayers,
            playerRoomState: this.playerRoomState,
            userRegistration: this.userRegistration,
            forgotPassword: this.forgotPassword,
            passwordManager: this.passwordManager,
            passwordValidationGuard: this.passwordValidationGuard,
            logUserData: this.logUserData.bind(this)
        });
        /** @type {AdministrationLogin} */
        this.administrationLogin = new AdministrationLogin({
            usersManager: this.usersManager,
            passwordManager: this.passwordManager,
            passwordValidationGuard: this.passwordValidationGuard
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
