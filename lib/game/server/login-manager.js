/**
 *
 * Reldens - LoginManager
 *
 */

const { PasswordManager } = require('./password-manager');
const { RoomsConst } = require('../../rooms/constants');
const { GameConst } = require('../constants');
const { ErrorManager, Logger, sc } = require('@reldens/utils');

class LoginManager
{

    constructor(props)
    {
        this.config = props.config;
        this.usersManager = props.usersManager;
        this.roomsManager = props.roomsManager;
        this.passwordManager = PasswordManager;
        this.mailer = props.mailer;
        this.themeManager = props.themeManager;
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in LoginManager.');
        }
        this.activeUsers = {};
        this.activeUsersSessionIds = {};
        this.listenEvents();
    }

    listenEvents()
    {
        if(!this.events){
            return false;
        }
        this.events.on('reldens.serverBeforeListen', async (props) => {
            await props.serverManager.app.get('/reldens-mailer-enabled', async (req, res) => {
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
        });
    }

    async processUserRequest(userData = false)
    {
        if(sc.hasOwn(userData, 'forgot')){
            if(!this.mailer.isEnabled()){
                // @TODO - WIP - TRANSLATIONS.
                return {error: 'The forgot password email can not be send, please contact the administrator.'};
            }
            let result = await this.processForgotPassword(userData);
            this.events.emitSync('reldens.processForgotPassword', this, userData, result);
            return result;
        }
        this.events.emitSync('reldens.processUserRequestIsValidDataBefore', this, userData);
        if(!this.isValidData(userData)){
            let errorMessage = 'Incomplete user login data.';
            if(!userData.username){
                errorMessage = 'Please, complete your username, the same is always required to login.';
            }
            let result = {error: errorMessage};
            this.events.emitSync('reldens.invalidData', this, userData, result);
            return result;
        }
        let result = {error: 'Invalid user data.'};
        let user = await this.usersManager.loadUserByUsername(userData.username);
        if(user && userData.isGuest && userData.isNewUser){
            Logger.debug('Guest login invalid user data.', userData);
            this.events.emitSync('reldens.guestLoginInvalidParams', this, user, userData, result);
            return result;
        }
        if(user){
            return await this.login(user, userData);
        }
        if(userData.isGuest){
            userData.email = userData.username+'@guest-reldens.com';
            userData.password = sc.randomChars(12);
            return await this.register(userData);
        }
        if(!userData.isNewUser){
            Logger.info('Invalid user login data.', {user: userData.username});
            this.events.emitSync('reldens.loginInvalidParams', this, user, userData, result);
        }
        if(userData.isNewUser){
            user = await this.usersManager.loadUserByEmail(userData.email);
            if(user){
                Logger.info('User already exists.', userData);
                this.events.emitSync('reldens.registrationInvalidParams', this, user, userData, result);
            }
            if(!user){
                return await this.register(userData);
            }
        }
        return result;
    }

    isValidData(userData)
    {
        return !(!userData || !sc.hasOwn(userData, 'username') || !userData.username.length);
    }

    async login(user, userData)
    {
        let result = {error: 'Login, invalid user data.'};
        // check guest user:
        if(!this.isValidGuestLogin(userData, user)){
            Logger.error('Guest user is not active for login.', userData);
            this.events.emitSync('reldens.loginInvalidRole', this, user, userData, result);
            return result;
        }
        // check if the passwords match:
        if(!this.passwordManager.validatePassword(userData.password, user.password)){
            Logger.error('Invalid password for user login.', userData);
            this.events.emitSync('reldens.loginInvalidPassword', this, user, userData, result);
            return result;
        }
        try {
            if(sc.isArray(user.players) && 0 < user.players.length){
                // set the scene on the user players:
                this.events.emitSync('reldens.setSceneOnPlayers', this, user, userData);
                await this.setSceneOnPlayers(user, userData);
            }
            let result = {user: user};
            this.events.emitSync('reldens.loginSuccess', this, user, userData, result);
            return result;
        } catch (err) {
            Logger.error('Login try/catch error.', err, userData);
            this.events.emitSync('reldens.loginError', this, user, userData, result);
            return result;
        }
    }

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
        return Boolean(this.activeUsers[user.username]);
    }

    async setSceneOnPlayers(user, userData)
    {
        for(let player of user.players){
            if(!player.state){
                continue;
            }
            let config = this.config.get('client/rooms/selection');
            if(
                config.allowOnLogin
                && userData['selectedScene']
                && userData['selectedScene'] !== RoomsConst.ROOM_LAST_LOCATION_KEY
            ){
                await this.applySelectedLocation(player, userData['selectedScene']);
            }
            player.state.scene = await this.getRoomNameById(player.state.room_id);
        }
    }

    async roleAuthenticationCallback(email, password, roleId = false)
    {
        let user = await this.usersManager.loadUserByEmail(email);
        let validatedRole = !roleId || String(user.role_id) === String(roleId);
        if(user && validatedRole){
            let result = this.passwordManager.validatePassword(
                password,
                user.password
            );
            if(result){
                return user;
            }
        }
        return false;
    }

    async applySelectedLocation(player, selectedScene)
    {
        let selectedRoom = await this.roomsManager.loadRoomByName(selectedScene);
        if(!selectedRoom){
            return false;
        }
        player.state = this.getStateObjectFromRoom(selectedRoom);
    }

    async getRoomNameById(roomId)
    {
        let playerRoom = await this.roomsManager.loadRoomById(roomId);
        if(playerRoom){
            return playerRoom.roomName;
        }
        return GameConst.ROOM_NAME_MAP;
    }

    async register(userData)
    {
        let result = {error: 'Registration error, there was an error with your request, please try again later.'};
        if(!userData.isNewUser){
            Logger.error('Registration invalid parameters.', userData);
            await this.events.emit('reldens.register', this, userData, result);
            return result;
        }
        try {
            // if the email doesn't exist in the database, and it's a registration request:
            // insert user, player, player state, player stats, class path:
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
        } catch (err) {
            Logger.error('Registration try/catch error.', err,  userData);
            await this.events.emit('reldens.createNewUserError', this, userData, result);
            return result;
        }
    }

    async createNewPlayer(loginData)
    {
        let minimumPlayerNameLength = this.config.getWithoutLogs('client/players/name/minimumLength', 3);
        if(minimumPlayerNameLength > loginData['new-player-name'].toString().length){
            let result = {error: true, message: 'Invalid player name, please choose another name.'};
            await this.events.emit('reldens.playerNewName', this, loginData, result);
            return result;
        }
        let initialState = await this.prepareInitialState(loginData['selectedScene']);
        if(!await this.validateInitialState(initialState)){
            let result = {
                error: true,
                message: 'There was an error with the player initial state, please contact the administrator.'
            };
            await this.events.emit('reldens.playerSceneUnavailable', this, loginData, result);
            return result;
        }
        let playerData = {
            name: loginData['new-player-name'],
            user_id: loginData.user_id,
            state: initialState
        };
        await this.events.emit('reldens.createNewPlayerBefore', loginData, playerData, this);
        let isTaken = await this.usersManager.isNameAvailable(playerData.name);
        if(isTaken){
            let result = {error: true, message: 'The player name is not available, please choose another name.'};
            await this.events.emit('reldens.playerNewNameUnavailable', this, loginData, isTaken, result);
            return result;
        }
        try {
            let player = await this.usersManager.createPlayer(playerData);
            player.state.scene = await this.getRoomNameById(initialState.room_id);
            let result = {error: false, player};
            await this.events.emit('reldens.createdNewPlayer', player, loginData, this, result);
            return result;
        } catch (err) {
            Logger.critical('Player creation error', err);
            let result = {error: true, message: 'There was an error creating your player, please try again.'};
            await this.events.emit('reldens.createNewPlayerCriticalError', this, loginData, err, result);
            return result;
        }
    }

    async validateInitialState(initialState)
    {
        if(!initialState){
            return false;
        }
        let roomId = sc.get(initialState, 'room_id', false);
        if(false === roomId){
            return false;
        }
        return await this.roomsManager.loadRoomById(roomId);
    }

    async prepareInitialState(roomName)
    {
        let config = this.config.get('client/rooms/selection');
        let initialState = this.config.server.players.initialState;
        if(!config.allowOnRegistration || !roomName){
            if(!initialState){
                Logger.critical('Initial state is not defined!');
                return false;
            }
            return initialState;
        }
        let selectedRoom = await this.roomsManager.loadRoomByName(roomName);
        if(!selectedRoom){
            if(!initialState){
                Logger.critical('Initial state is not defined!');
                return false;
            }
            return initialState;
        }
        return this.getStateObjectFromRoom(selectedRoom);
    }

    getStateObjectFromRoom(selectedRoom)
    {
        return {
            room_id: selectedRoom.roomId,
            x: selectedRoom.returnPointDefault?.X || (this.config.get('client/map/tileData/width') * 2),
            y: selectedRoom.returnPointDefault?.Y || (this.config.get('client/map/tileData/height') * 2),
            dir: selectedRoom.returnPointDefault?.D || GameConst.DOWN
        };
    }

    async updateLastLogin(userModel)
    {
        let updated = await this.usersManager.updateUserLastLogin(userModel.username);
        if(!updated){
            // @TODO - BETA - Logout user.
            ErrorManager.error('User update fail.');
        }
    }

    async processForgotPassword(userData)
    {
        // @TODO - WIP - TRANSLATIONS.
        if(!sc.hasOwn(userData, 'email')){
            return {error: 'Please complete your email.'};
        }
        let user = await this.usersManager.loadUserByEmail(userData.email);
        if(!user){
            return {error: 'If the email exists as user then a reset password link should be received soon.'};
        }
        let forgotLimit = Number(process.env.RELDENS_MAILER_FORGOT_PASSWORD_LIMIT) || 4;
        let microLimit = Date.now() - (forgotLimit * 60 * 60 * 1000);
        let statusInt = Number(user.status);
        if(statusInt >= microLimit){
            return {error: 'Reset link already sent.'};
        }
        let sendResult = {result: await this.sendForgotPasswordEmail(userData, user.password)};
        if(sendResult.result){
            await this.usersManager.updateUserByEmail(userData.email, {status: Date.now()});
            sendResult.error = 'If the email exists then a reset password link should be received soon.';
        }
        return sendResult;
    }

    async sendForgotPasswordEmail(userData, oldPassword)
    {
        // @TODO - WIP - TRANSLATIONS.
        let emailPath = this.themeManager.assetPath('email', 'forgot.html');
        let resetLink = this.config.server.baseUrl + '/reset-password?email='+userData.email+'&id='+oldPassword;
        let subject = this.config.getWithoutLogs('server/mailer/forgotPassword/subject', 'Forgot password');
        let content = await this.themeManager.loadAndRenderTemplate(emailPath, {resetLink: resetLink});
        // @TODO - BETA - Make all system messages configurable.
        try {
            return await this.mailer.sendEmail({
                from: this.mailer.from,
                to: userData.email,
                subject,
                html: content
            });
        } catch (error) {
            return false;
        }
    }

}

module.exports.LoginManager = LoginManager;
