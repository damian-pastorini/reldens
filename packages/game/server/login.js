/**
 *
 * Reldens - LoginManager
 *
 * This class implements the users model to validate the login data and return the result.
 *
 */

const path = require('path');
const { PasswordManager } = require('./password-manager');
const { ErrorManager, EventsManagerSingleton } = require('@reldens/utils');

class LoginManager
{

    constructor(props)
    {
        this.config = props.config;
        this.usersManager = props.usersManager;
        this.roomsManager = props.roomsManager;
        this.pwManager = PasswordManager;
        this.mailer = props.mailer;
        this.themeManager = props.themeManager;
    }

    async processUserRequest(userData = false)
    {
        if({}.hasOwnProperty.call(userData, 'forgot')){
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
            || !{}.hasOwnProperty.call(userData, 'username')
            || !{}.hasOwnProperty.call(userData, 'password')
            || !userData.username.length
            || !userData.password.length
        );
    }

    async login(user, userData)
    {
        // check if the passwords match:
        if(!this.pwManager.validatePassword(userData.password, user.password)){
            // if the password doesn't match return an error:
            return {error: 'User already exists or invalid user data.'};
        } else {
            try {
                // if everything is good then just return the user:
                let player = user.players[0];
                player.state.scene = await this.getRoomNameById(player.state.room_id);
                return {user: user};
            } catch (err) {
                return {error: err};
            }
        }
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
                    password: this.pwManager.encryptPassword(userData.password),
                    role_id: this.config.server.players.initialUser.role_id,
                    status: this.config.server.players.initialUser.status,
                    players: [{
                        name: userData.username,
                        // @NOTE: new users will always use the same initial state and it is part of this package.
                        state: this.config.server.players.initialState
                    }]
                });
                let configRoomId = this.config.server.players.initialState.room_id;
                newUser.players[0].state.scene = await this.getRoomNameById(configRoomId);
                await EventsManagerSingleton.emit('reldens.createNewUserAfter', newUser, this);
                return {user: newUser};
            } catch (err) {
                return {error: 'Unable to register the user.', catch: err};
            }
        } else {
            return {error: 'Unable to authenticate the user.'};
        }
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
        if(!{}.hasOwnProperty.call(userData, 'email')){
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
        // @TODO - BETA.17 - Make all system messages configurable.
        return await this.mailer.sendEmail({
            to: userData.email,
            subject: subject,
            html: content
        });
    }

}

module.exports.LoginManager = LoginManager;
