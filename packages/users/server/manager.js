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
        let loadedUser = await UsersModel.loadUserBy('username', username);
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
        let loadedUser = await UsersModel.loadUserBy('email', email);
        if(loadedUser){
            result = loadedUser;
        }
        return result;
    }

    async createUser(userData)
    {
        return UsersModel.saveUser(userData);
    }

    updateUserLastLogin(username)
    {
        // get date:
        let date = new Date();
        // format:
        let dateFormat = date.toISOString().slice(0, 19).replace('T', ' ');
        // save user:
        return UsersModel.updateBy('username', username, {updated_at: dateFormat});
    }

    updateUserByEmail(email, updatePatch)
    {
        return UsersModel.updateBy('email', email, updatePatch);
    }

    updateUserStateByPlayerId(playerId, newState)
    {
        return PlayersStateModel.updateBy('player_id', playerId, newState);
    }

    async updatePlayerStatByIds(playerId, statId, statPatch)
    {
        return PlayersStatsModel.query()
            .patch(statPatch)
            .where({player_id: playerId, stat_id: statId});
    }

}

module.exports.UsersManager = UsersManager;
