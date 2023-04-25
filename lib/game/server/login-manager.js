/**
 *
 * Reldens - LoginManager
 *
 * This class implements the users model to validate the login data and return the result.
 *
 */

const { PasswordManager } = require('./password-manager');
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
        this.listenEvents();
    }

    listenEvents()
    {
        this.events.on('reldens.serverBeforeListen', (props) => {
            props.serverManager.app.get('/reldens-mailer-enabled', (req, res) => {
                res.json({
                    enabled: this.mailer.isEnabled()
                });
            });
            props.serverManager.app.get('/terms-and-conditions', (req, res) => {
                res.json({
                    heading: this.config.getWithoutLogs('client/login/terms_and_conditions/heading', ''),
                    body: this.config.getWithoutLogs('client/login/terms_and_conditions/body', ''),
                    checkboxLabel: this.config.getWithoutLogs('client/login/terms_and_conditions/checkbox_label', '')
                });
            });
        });
    }

    async processUserRequest(userData = false)
    {
        if(sc.hasOwn(userData, 'forgot')){
            if(!this.mailer.isEnabled()){
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
        // search if the user exists:
        let user = await this.usersManager.fetchUserByNameOrEmail(userData.username, userData.email);
        if(user && userData.isNewUser){
            let result = {error: 'Registration error, wrong user data.'};
            this.events.emitSync('reldens.loadUserByUsernameResult', this, userData, result);
            return result;
        }
        if(user){
            return await this.login(user, userData);
        }
        return await this.register(userData);
    }

    isValidData(userData)
    {
        return !(!userData
            || !sc.hasOwn(userData, 'username')
            || !sc.hasOwn(userData, 'password')
            || !userData.username.length
            || !userData.password.length
        );
    }

    async login(user, userData)
    {
        // check if the passwords match:
        if(!this.passwordManager.validatePassword(userData.password, user.password)){
            let result = {error: 'Invalid user data.'};
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
            let result = {error: err};
            this.events.emitSync('reldens.loginError', this, user, userData, result);
            return result;
        }
    }

    async setSceneOnPlayers(user, userData)
    {
        for(let player of user.players){
            if(!player.state){
                continue;
            }
            let config = this.config.get('client/rooms/selection');
            if(config.allowOnLogin && userData['selectedScene'] && userData['selectedScene'] !== '@lastLocation'){
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
        return 'Map';
    }

    async register(userData)
    {
        if(!userData.isNewUser){
            let result = {error: 'Registration error, there was an error with your request, please try again later.'};
            Logger.error('An user tried to register without the proper request.', userData);
            await this.events.emit('reldens.register', this, userData, result);
            return result;
        }
        try {
            // if the email doesn't exist in the database, and it's a registration request:
            // insert user, player, player state, player stats, class path:
            let newUser = await this.usersManager.createUser({
                email: userData.email,
                username: userData.username,
                password: this.passwordManager.encryptPassword(userData.password),
                role_id: this.config.server.players.initialUser.role_id,
                status: this.config.server.players.initialUser.status
            });
            let result = {user: newUser};
            await this.events.emit('reldens.createNewUserAfter', newUser, this, result);
            return result;
        } catch (err) {
            let result = {error: 'Unable to register the user.', catch: err};
            await this.events.emit('reldens.createNewUserError', this, userData, result);
            return result;
        }
    }

    async createNewPlayer(loginData)
    {
        if(loginData['new_player_name'].toString().length < 3){
            let result = {error: true, message: 'Invalid player name, please choose another name.'};
            await this.events.emit('reldens.playerNewName', this, loginData, result);
            return result;
        }
        let initialState = await this.prepareInitialState(loginData['selectedScene']);
        let playerData = {
            name: loginData['new_player_name'],
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

    async prepareInitialState(roomName)
    {
        let config = this.config.get('client/rooms/selection');
        if(!config.allowOnRegistration || !roomName){
            return this.config.server.players.initialState;
        }
        let selectedRoom = await this.roomsManager.loadRoomByName(roomName);
        if(!selectedRoom){
            return this.config.server.players.initialState;
        }
        return this.getStateObjectFromRoom(selectedRoom);
    }

    getStateObjectFromRoom(selectedRoom)
    {
        return {
            room_id: selectedRoom.roomId,
            x: selectedRoom.returnPointDefault?.X || 0,
            y: selectedRoom.returnPointDefault?.Y || 0,
            dir: selectedRoom.returnPointDefault?.D || 0
        };
    }

    async updateLastLogin(authResult)
    {
        // update last login date:
        let updated = await this.usersManager.updateUserLastLogin(authResult.username);
        if(!updated){
            ErrorManager.error('User update fail.');
        }
    }

    async processForgotPassword(userData)
    {
        if(!sc.hasOwn(userData, 'email')){
            return {error: 'Please complete your email.'};
        }
        let user = await this.usersManager.loadUserByEmail(userData.email);
        if(!user){
            return {error: 'Email not found.'};
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
        let emailPath = this.themeManager.assetPath('email', 'forgot.html');
        let resetLink = this.config.server.baseUrl + '/reset-password?email='+userData.email+'&id='+oldPassword;
        let subject = process.env.RELDENS_MAILER_FORGOT_PASSWORD_SUBJECT || 'Forgot password';
        let content = await this.themeManager.loadAndRenderTemplate(emailPath, {resetLink: resetLink});
        // @TODO - BETA - Make all system messages configurable.
        return await this.mailer.sendEmail({
            from: this.mailer.from,
            to: userData.email,
            subject,
            html: content
        });
    }

}

module.exports.LoginManager = LoginManager;
