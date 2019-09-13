/**
 *
 * Reldens - UsersManager
 *
 * This class will handle the users from the database.
 *
 */

const UsersModel = require('./model');

class UsersManager
{

    async loadUserByUsername(username)
    {
        let result = false;
        if(!username){
            throw new Error('ERROR - Missing user name.');
        }
        let loadedUser = await UsersModel.query()
            .eager('players.[state, stats]')
            .where('username', username)
            .first();
        if(loadedUser.hasOwnProperty('username')){
            result = loadedUser;
        }
        return result;
    }

    async createUserWith(initialData)
    {
        let userData = initialData.data;
        let initState = initialData.state;
        let initStats = initialData.stats;
        let createdUser = await UsersModel.query()
            .allowInsert('players.[stats, state]')
            .insertGraph({
                email: userData.email,
                username: userData.username,
                password: initialData.hash,
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
        return createdUser;
    }

    async updateUserLastLogin(username)
    {
        // get date:
        let date = new Date();
        // format:
        let dateFormat = date.toISOString().slice(0, 19).replace('T', ' ');
        // save user:
        return UsersModel.query().patch({updated_at: dateFormat}).where('username', username);
    }

}

module.exports = UsersManager;
