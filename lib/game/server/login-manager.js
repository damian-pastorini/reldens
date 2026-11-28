/**
 *
 * Reldens - LoginManager
 *
 * Creates and exposes the user authentication flows: the game and guest login (GameLogin) and the administration panel
 * login (AdministrationLogin), which share the login attempts and the password validations guard. Creates and exposes
 * the user registration, the player creation, the forgot password and the user disconnection between rooms and
 * servers, and the usernames and emails check and the player names check between the servers with their own database
 * (one CrossServerNamesCheck per names route, the server/rooms/databases URLs without this server addresses), and
 * registers the login related routes, the signed disconnect and names check routes included. Integrates with
 * ConfigManager, UsersManager, RoomsManager, and Mailer. The login events receive this manager as their first argument.
 *
 */

const { ActivePlayers } = require('./memory/active-players');
const { LoginAttempts } = require('./memory/login-attempts');
const { PasswordValidationGuard } = require('./password-validation-guard');
const { AdministrationLogin } = require('./administration-login');
const { UserDisconnection } = require('./user-disconnection');
const { CrossServerNamesCheck } = require('./cross-server-names-check');
const { ServerUrlMatcher } = require('../server-url-matcher');
const { UserRegistration } = require('./user-registration');
const { PlayerRoomState } = require('./player-room-state');
const { PlayerCreation } = require('./player-creation');
const { ForgotPassword } = require('./forgot-password');
const { GameLogin } = require('./game-login');
const { GameConst } = require('../constants');
const { UsersConst } = require('../../users/constants');
const { Encryptor } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('./expiring-hmac-token').ExpiringHmacToken} ExpiringHmacToken
 * @typedef {import('./server-to-server-messenger-props').ServerToServerMessengerProps} ServerToServerMessengerProps
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
 * @property {ServerToServerMessengerProps} serverToServerMessengerProps
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
        /** @type {ActivePlayers} */
        this.activePlayers = new ActivePlayers();
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
        /** @type {ServerToServerMessengerProps} */
        this.serverToServerMessengerProps = props.serverToServerMessengerProps;
        /** @type {ExpiringHmacToken} */
        this.expiringHmacToken = this.serverToServerMessengerProps.expiringHmacToken;
        /** @type {PlayerRoomState} */
        this.playerRoomState = new PlayerRoomState({config: this.config, roomsManager: this.roomsManager});
        /** @type {UserDisconnection} */
        this.userDisconnection = new UserDisconnection(Object.assign(
            {
                roomsManager: this.roomsManager,
                activePlayers: this.activePlayers,
                disconnectUsersOnServerChange: this.config.getWithoutLogs(
                    'server/players/disconnectUsersOnServerChange',
                    true
                ),
                serverInstanceId: Encryptor.generateSecureToken(GameConst.DISCONNECTION.INSTANCE_ID_BYTES),
                routePath: GameConst.ROUTE_PATHS.DISCONNECT_USER
            },
            this.serverToServerMessengerProps
        ));
        /** @type {CrossServerNamesCheck} */
        this.userNamesCheck = this.createCrossServerNamesCheck(GameConst.ROUTE_PATHS.CHECK_USER_NAME);
        /** @type {CrossServerNamesCheck} */
        this.playerNamesCheck = this.createCrossServerNamesCheck(GameConst.ROUTE_PATHS.CHECK_PLAYER_NAME);
        /** @type {UserRegistration} */
        this.userRegistration = new UserRegistration({
            config: this.config,
            usersManager: this.usersManager,
            events: this.events,
            passwordManager: this.passwordManager,
            loginAttempts: this.loginAttempts,
            crossServerNamesCheck: this.userNamesCheck,
            logUserData: this.logUserData.bind(this)
        });
        /** @type {PlayerCreation} */
        this.playerCreation = this.createPlayerCreation();
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
     * @param {string} routePath
     * @returns {CrossServerNamesCheck}
     */
    createCrossServerNamesCheck(routePath)
    {
        return new CrossServerNamesCheck(Object.assign(
            {
                serversUrls: ServerUrlMatcher.fetchServersAddresses(
                    String(this.config.getWithoutLogs('server/rooms/databases', '')).split(','),
                    this.serverToServerMessengerProps.serverSelfAddresses
                ).addresses,
                usersManager: this.usersManager,
                routePath
            },
            this.serverToServerMessengerProps
        ));
    }

    /**
     * @returns {PlayerCreation}
     */
    createPlayerCreation()
    {
        return new PlayerCreation({
            config: this.config,
            usersManager: this.usersManager,
            roomsManager: this.roomsManager,
            events: this.events,
            playerRoomState: this.playerRoomState,
            crossServerNamesCheck: this.playerNamesCheck,
            minimumPlayerNameLength: this.config.getWithoutLogs('client/players/name/minimumLength', 3),
            maximumPlayerNameLength: this.config.getWithoutLogs(
                'client/players/name/maximumLength',
                UsersConst.PLAYER_NAME_MAXIMUM_LENGTH
            ),
            roomsSelection: this.config.get('client/rooms/selection'),
            isMultiplePlayersEnabled: this.config.getWithoutLogs('client/players/multiplePlayers/enabled', false)
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
            this.userDisconnection.registerRoute(props.serverManager);
            this.userNamesCheck.registerRoute(props.serverManager);
            this.playerNamesCheck.registerRoute(props.serverManager);
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
