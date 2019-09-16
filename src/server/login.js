/**
 *
 * Reldens - LoginManager
 *
 * This class implements the users model to validate the login data and return the result.
 *
 */

const bcrypt = require('bcrypt');
const share = require('../utils/constants');

class LoginManager
{

    constructor(props)
    {
        this.config = props.config;
        this.usersManager = props.usersManager;
        this.roomsManager = props.roomsManager;
        this.saltRounds = 10;
        // if stored config doesn't have the initial scene specified then get the default values:
        if(
            !this.config.hasOwnProperty('players')
            || !this.config.players.hasOwnProperty('initialState')
            || !this.config.players.hasOwnProperty('initialStats')
        ){
            this.config.players = {
                initialStats: require('../../config/initial-stats'),
                initialState: require('../../config/initial-state')
            };
        }
    }

    async attemptLoginOrRegister(userData = false)
    {
        if(!userData || !userData.hasOwnProperty('username') || !userData.hasOwnProperty('password')){
            return {error: 'Missing user login data.'};
        }
        // search if the email was already used:
        let user = await this.usersManager.loadUserByUsername(userData.username);
        if(!user && !userData.isNewUser){
            return {error: 'Missing user data.'};
        }
        // if the email exists:
        if(user){
            // check if player status is not active or if the password doesn't match then return an error:
            if(user.status !== 1 || !this.validatePassword(userData.password, user.password)){
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
        } else {
            // if the email doesn't exists in the database and it's a registration request:
            if(userData.isNewUser){
                try {
                    // insert user, player, player state and player stats:
                    let initialState = this.config.players.initialState;
                    let initialRoom = await this.roomsManager.loadRoomByName(initialState.scene);
                    initialState.room_id = initialRoom.roomId;
                    let newUser = await this.usersManager.createUserWith({
                        data: userData,
                        state: initialState,
                        stats: this.config.players.initialStats,
                        hash: this.encryptPassword(userData.password)
                    });
                    newUser.players[0].state.scene = initialState.scene;
                    return {user: newUser};
                } catch (err) {
                    // if there's any error then reject:
                    console.log('ERROR - Unable to register the user.', err);
                    return {error: 'Unable to register the user.', catch: err};
                }
            } else {
                return {error: 'Unable to authenticate the user.'};
            }
        }
    }

    validatePassword(receivedPassword, storedPassword)
    {
        return bcrypt.compareSync(receivedPassword, storedPassword);
    }

    encryptPassword(receivedPassword)
    {
        // generate the password hash:
        let salt = bcrypt.genSaltSync(this.saltRounds);
        return bcrypt.hashSync(receivedPassword, salt);
    }

    async startGame(client, room, authResult)
    {
        let user = await this.usersManager.loadUserByUsername(authResult.username);
        // @NOTE: for now we will only have 1 player per user, that's why we send players[0].
        let player = user.players[0];
        let playerRoom = await this.roomsManager.loadRoomById(player.state.room_id);
        player.state.scene = playerRoom.roomName;
        // update last login date:
        let updated = await this.usersManager.updateUserLastLogin(authResult.username);
        if(!updated){
            throw new Error('ERROR - User update fail.');
        }
        // client start:
        room.send(client, {
            act: share.START_GAME,
            sessionId: client.sessionId,
            player: player,
            gameConfig: this.config.gameEngine
        });
    }

}

module.exports = LoginManager;