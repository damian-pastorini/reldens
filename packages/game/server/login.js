/**
 *
 * Reldens - LoginManager
 *
 * This class implements the users model to validate the login data and return the result.
 *
 */

const { PasswordManager } = require('./password-manager');
const { ErrorManager } = require('@reldens/utils');

class LoginManager
{

    constructor(props)
    {
        this.config = props.config;
        this.usersManager = props.usersManager;
        this.roomsManager = props.roomsManager;
    }

    async attemptLoginOrRegister(userData = false)
    {
        if(!this.isValidData(userData)){
            return {error: 'Missing user login data.'};
        }
        // search if the email was already used:
        let user = await this.usersManager.loadUserByUsername(userData.username);
        if(!user && !userData.isNewUser){
            return {error: 'Missing user data.'};
        }
        // if the email exists:
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
            || !{}.hasOwnProperty.call(userData, 'password'));
    }

    async login(user, userData)
    {
        // check if player status is not active or if the password doesn't match then return an error:
        if(user.status !== 1 || !PasswordManager.validatePassword(userData.password, user.password)){
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

    // @TODO: create room association with player in database and make it load automatically? or keep modules
    //   independent some how? Analyze.
    async getRoomNameById(roomId)
    {
        let playerRoom = await this.roomsManager.loadRoomById(roomId);
        return playerRoom.roomName;
    }

    async register(userData)
    {
        // if the email doesn't exists in the database and it's a registration request:
        if(userData.isNewUser){
            try {
                // insert user, player, player state and player stats:
                let newUser = await this.usersManager.createUser({
                    email: userData.email,
                    username: userData.username,
                    password: PasswordManager.encryptPassword(userData.password),
                    role_id: this.config.server.players.initialUser.role_id,
                    status: this.config.server.players.initialUser.status,
                    players: {
                        name: userData.username,
                        stats: this.config.server.players.initialStats,
                        state: this.config.server.players.initialState
                    }
                });
                let configRoomId = this.config.server.players.initialState.room_id;
                newUser.players[0].state.scene = await this.getRoomNameById(configRoomId);
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

}

module.exports.LoginManager = LoginManager;
