/**
 *
 * Reldens - UsersManager
 *
 * This class will handle the users from the database.
 *
 */

const { UsersModel } = require('./model');
const { PlayersStateModel } = require('./players-state-model');
const { ErrorManager } = require('../../game/error-manager');

class UsersManager
{

    async loadUserByUsername(username)
    {
        let result = false;
        if(!username){
            ErrorManager.error('Missing user name.');
        }
        let loadedUser = await UsersModel.query()
            .eager('players.[state, stats]')
            .where('username', username)
            .first();
        if(loadedUser){
            result = loadedUser;
        }
        return result;
    }

    async createUserWith(initialData)
    {
        let userData = initialData.data;
        let initState = initialData.state;
        let initStats = initialData.stats;
        // @TODO: can this delete be improved? it doesn't looks good, but it was that or set each field manually.
        // we need to remove the scene prop before insert since it's not a valid field:
        delete(initState['scene']);
        // insert data:
        return UsersModel.query()
            .allowInsert('players.[stats, state]')
            .insertGraphAndFetch({
                email: userData.email,
                username: userData.username,
                password: initialData.hash,
                role_id: initialData.role_id,
                status: initialData.status,
                players: {
                    name: userData.username,
                    stats: initStats,
                    state: initState
                }
            }
        );
    }

    updateUserLastLogin(username)
    {
        // get date:
        let date = new Date();
        // format:
        let dateFormat = date.toISOString().slice(0, 19).replace('T', ' ');
        // save user:
        return UsersModel.query().patch({updated_at: dateFormat}).where('username', username);
    }

    updateUserStateByPlayerId(playerId, newState)
    {
        return PlayersStateModel.query().patch(newState).where('player_id', playerId);
    }

}

module.exports.UsersManager = UsersManager;
