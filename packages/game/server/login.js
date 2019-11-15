/**
 *
 * Reldens - LoginManager
 *
 * This class implements the users model to validate the login data and return the result.
 *
 */

const { PasswordManager } = require('./password-manager');
const { GameConst } = require('../constants');
const { Logger } = require('../logger');
const { ErrorManager } = require('../error-manager');

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
            return await this.getLoginResult(user, userData);
        } else {
            return await this.getRegistrationResult(userData);
        }
    }

    isValidData(userData)
    {
        return !(!userData
            || !{}.hasOwnProperty.call(userData, 'username')
            || !{}.hasOwnProperty.call(userData, 'password'));
    }

    async getLoginResult(user, userData)
    {
        // check if player status is not active or if the password doesn't match then return an error:
        if(user.status !== 1 || !PasswordManager.validatePassword(userData.password, user.password)){
            // if the password doesn't match return an error:
            return {error: 'User already exists or invalid user data.'};
        } else {
            try {
                // if everything is good then just return the user:
                let player = user.players[0];
                let playerRoom = await this.roomsManager.loadRoomById(player.state.room_id);
                player.state.scene = playerRoom.roomName;
                return {user: user};
            } catch (err) {
                return {error: err};
            }
        }
    }

    async getRegistrationResult(userData)
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
                let initialRoom = await this.roomsManager.loadRoomById(this.config.server.players.initialState.room_id);
                newUser.players[0].state.scene = initialRoom.name;
                return {user: newUser};
            } catch (err) {
                // if there's any error then reject:
                Logger.error(['Unable to register the user.', err]);
                return {error: 'Unable to register the user.', catch: err};
            }
        } else {
            return {error: 'Unable to authenticate the user.'};
        }
    }

    // @TODO: move into the server manager? or maybe into the RoomGame which only responsibility is to start it.
    async startGameEngine(client, room, authResult)
    {
        let user = await this.usersManager.loadUserByUsername(authResult.username);
        // @NOTE: for now we will only have 1 player per user, that's why we send players[0].
        let player = user.players[0];
        let playerRoom = await this.roomsManager.loadRoomById(player.state.room_id);
        player.state.scene = playerRoom.roomName;
        // update last login date:
        let updated = await this.usersManager.updateUserLastLogin(authResult.username);
        if(!updated){
            ErrorManager.error('User update fail.');
        }
        // we need to send the engine and all the general and client configurations from the storage:
        let storedClientAndGeneral = {client: this.config.client, general: this.config.general};
        let clientFullConfig = Object.assign({}, this.config.gameEngine, storedClientAndGeneral);
        // client start:
        room.send(client, {
            act: GameConst.START_GAME,
            sessionId: client.sessionId,
            player: player,
            gameConfig: clientFullConfig,
            features: this.config.availableFeaturesList
        });
    }

}

module.exports = LoginManager;
