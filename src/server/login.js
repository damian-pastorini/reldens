/**
 *
 * Reldens - LoginManager
 *
 * This class implements the users model to validate the login data and return the result.
 *
 */

const bcrypt = require('bcrypt');
const UsersModel = require('../users/model');

class LoginManager
{

    constructor(storedConfig)
    {
        this.saltRounds = 10;
        this.config = storedConfig;
        // if stored config doesn't have the initial scene specified then get the default values:
        if(
            !this.config.hasOwnProperty('players')
            || !this.config.players.hasOwnProperty('initialState')
            || !this.config.players.hasOwnProperty('initialStats')
        ){
            this.config.players = {
                initialStats: require('../../config/initial-stats'),
                initialState: require('../../config/initial-scene')
            };
        }
    }

    async attemptLoginOrRegister(userData = false)
    {
        if(!userData || !userData.hasOwnProperty('username') || !userData.hasOwnProperty('password')){
            return {error: 'Missing user data.'};
        }
        // first find if the email was used already:
        let user = UsersModel.query().eager('player.[state, stats]').where('username', userData.username);
        if(!user && !userData.isNewUser){
            return {error: 'Missing user data.'};
        }
        // generate the password hash:
        let salt = bcrypt.genSaltSync(this.saltRounds);
        let hash = bcrypt.hashSync(userData.password, salt);
        // if the email exists:
        if(user){
            // check if player status is not active or if the password doesn't match then return an error:
            if(user.status !== 1 || !bcrypt.compareSync(userData.password, user.password)){
                // if the password doesn't match return an error:
                return {error: 'User already exists or invalid user data.'};
            } else {
                // if everything is good then just return the user:
                return {user: user};
            }
        } else {
            // if the email doesn't exists in the database and it's a registration request:
            if(userData.isNewUser){
                try {
                    // default data:
                    let initStats = this.config.players.initialStats;
                    let initState = this.config.players.initialState;
                    // insert user, player, player state and player stats:
                    user = await UsersModel.createUserWith({
                        data: userData,
                        state: initState,
                        stats: initStats,
                        hash: hash
                    });
                        /*
                        .query()
                        .allowInsert('[player.stats, player.state]')
                        .insertGraph({
                            email: userData.email,
                            username: userData.username,
                            password: hash,
                            role_id: 1,
                            status: 1,
                            player: {
                                name: userData.username,
                                stats: {
                                    hp: initStats.hp,
                                    mp: initStats.mp,
                                    stamina: initStats.stamina,
                                    atk: initStats.atk,
                                    def: initStats.def,
                                    dodge: initStats.dodge,
                                    speed: initStats.speed
                                },
                                state: {
                                    scene: initState.scene,
                                    x: initState.x,
                                    y: initState.y,
                                    dir: initState.dir
                                }
                            }
                        });
                        */
                    // if is a new user status is always active by default:
                    userData.isNewUser = false;
                    userData.role_id = 1;
                    userData.status = 1;
                    let defaultState = `{"scene":"${initState.scene}","x":"${initState.x}","y":"${initState.y}","dir":"${initState.dir}"}`;
                    userData.state = defaultState;
                    return {user: userData};
                } catch (err) {
                    // if there's any error then reject:
                    // console.log('ERROR - Unable to register the user.', err);
                    return {error: 'Unable to register the user.', catch: err};
                }
            } else {
                return {error: 'Unable to authenticate the user.'};
            }
        }
    }

}

module.exports = LoginManager;