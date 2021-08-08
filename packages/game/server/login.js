/**
 *
 * Reldens - LoginManager
 *
 * This class implements the users model to validate the login data and return the result.
 *
 */

const path = require('path');
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
        this.events = sc.getDef(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in LoginManager.');
        }
    }

    async processUserRequest(userData = false)
    {
        if(sc.hasOwn(userData, 'forgot')){
            return await this.processForgotPassword(userData);
        }
        if(!this.isValidData(userData)){
            let errorMessage = 'Incomplete user login data.';
            if(!userData.username){
                errorMessage = 'Please, complete your username, the same is always required to login.';
            }
            return {error: errorMessage};
        }
        // search if the user already exists:
        let user = await this.usersManager.loadUserByUsername(userData.username);
        if(!user && !userData.isNewUser){
            return {error: 'Missing user data.'};
        }
        // if the user exists:
        if(user){
            return await this.login(user, userData);
        } else {
            return await this.register(userData);
        }
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
            // if the password doesn't match return an error:
            return {error: 'User already exists or invalid user data.'};
        } else {
            try {
                // set the scene on the user players:
                if(user.players){
                    for(let player of user.players){
                        if(!player.state){
                            continue;
                        }
                        let config = this.config.get('client/rooms/selection');
                        if(
                            config.allowOnLogin
                            && userData['selectedScene']
                            && userData['selectedScene'] !== '@lastLocation'
                        ){
                            await this.applySelectedLocation(player, userData['selectedScene']);
                        }
                        player.state.scene = await this.getRoomNameById(player.state.room_id);
                    }
                }
                // if everything is good then just return the user:
                return {user: user};
            } catch (err) {
                return {error: err};
            }
        }
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
        if(userData.isNewUser){
            try {
                // check if an user with the email exists:
                let user = await this.usersManager.loadUserByEmail(userData.email);
                if(user){
                    let message = 'Registration error, please contact the administrator.';
                    if(userData.isFirebaseLogin){
                        message = 'Login error, wrong username.';
                    }
                    return {error: message};
                }
                // if the email doesn't exists in the database and it's a registration request:
                // insert user, player, player state, player stats, class path:
                let newUser = await this.usersManager.createUser({
                    email: userData.email,
                    username: userData.username,
                    password: this.passwordManager.encryptPassword(userData.password),
                    role_id: this.config.server.players.initialUser.role_id,
                    status: this.config.server.players.initialUser.status
                });
                await this.events.emit('reldens.createNewUserAfter', newUser, this);
                return {user: newUser};
            } catch (err) {
                return {error: 'Unable to register the user.', catch: err};
            }
        } else {
            return {error: 'Unable to authenticate the user.'};
        }
    }

    async createNewPlayer(loginData)
    {
        if(loginData['new_player_name'].toString().length < 3){
            return {error: true, message: 'Invalid player name, please choose another name.'};
        }
        let initialState = await this.prepareInitialState(loginData['selectedScene']);
        let playerData = {
            name: loginData['new_player_name'],
            user_id: loginData.user_id,
            state: initialState
        };
        await this.events.emit('reldens.createNewPlayerBefore', loginData, playerData, this);
        let isNameAvailable = await this.usersManager.isNameAvailable(playerData.name);
        if(!isNameAvailable){
            return {error: true, message: 'The player name is not available, please choose another name.'};
        }
        try {
            let player = await this.usersManager.createPlayer(playerData);
            player.state.scene = await this.getRoomNameById(initialState.room_id);
            await this.events.emit('reldens.createdNewPlayer', player, loginData, this);
            return {error: false, player};
        } catch (err) {
            return {error: true, message: 'There was an error creating your player, please try again.'};
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
            x: selectedRoom.returnPointDefault.X,
            y: selectedRoom.returnPointDefault.Y,
            dir: selectedRoom.returnPointDefault.D
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
        await this.usersManager.updateUserByEmail(userData.email, {status: Date.now()});
        return await this.sendForgotPasswordEmail(userData, user.password);
    }

    async sendForgotPasswordEmail(userData, oldPassword)
    {
        let emailPath = path.join('assets', 'email', 'forgot.html');
        let resetLink = this.config.server.baseUrl + '/reset-password?email='+userData.email+'&id='+oldPassword;
        let subject = process.env.RELDENS_MAILER_FORGOT_PASSWORD_SUBJECT || 'Forgot password';
        let content = await this.themeManager.loadAndRenderTemplate(emailPath, {resetLink: resetLink});
        // @TODO - BETA - Make all system messages configurable.
        return await this.mailer.sendEmail({
            to: userData.email,
            subject: subject,
            html: content
        });
    }

}

module.exports.LoginManager = LoginManager;
