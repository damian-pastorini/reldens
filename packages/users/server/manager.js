/**
 *
 * Reldens - UsersManager
 *
 * This class will handle the users from the database.
 *
 */

const { UsersModel } = require('./model');
const { PlayersStateModel } = require('./players-state-model');
const { PlayersStatsModel } = require('./players-stats-model');
const { ErrorManager } = require('@reldens/utils');

class UsersManager
{

    async loadUserByUsername(username)
    {
        let result = false;
        if(!username){
            ErrorManager.error('Missing user name.');
        }
        let loadedUser = await UsersModel.query()
            .withGraphFetched('players.[state, stats]')
            .where('username', username)
            .first();
        if(loadedUser){
            result = loadedUser;
        }
        return result;
    }

    async loadUserByEmail(email)
    {
        let result = false;
        if(!email){
            ErrorManager.error('Missing email.');
        }
        let loadedUser = await UsersModel.query()
            .withGraphFetched('players.[state, stats]')
            .where('email', email)
            .first();
        if(loadedUser){
            result = loadedUser;
        }
        return result;
    }

    async createUser(userData)
    {
        return UsersModel.query()
            .allowInsert('players.[stats, state]')
            .insertGraphAndFetch(userData);
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

    updateUserByEmail(email, updatePatch)
    {
        // save user:
        return UsersModel.query().patch(updatePatch).where('email', email);
    }

    updateUserStateByPlayerId(playerId, newState)
    {
        return PlayersStateModel.query().patch(newState).where('player_id', playerId);
    }

    updateUserStatsByPlayerId(playerId, newStats)
    {
        return PlayersStatsModel.query().patch(newStats).where('player_id', playerId);
    }

}

module.exports.UsersManager = UsersManager;
