/**
 *
 * Reldens - UsersManager
 *
 * This class will handle the users from the database.
 *
 */

const { UsersModel } = require('./model');
const { PlayersModel } = require('./players-model');
const { PlayersStateModel } = require('./players-state-model');
const { PlayersStatsModel } = require('./players-stats-model');
const { StatsModel } = require('./stats-model');
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
        return await UsersModel.saveUser(userData);
    }

    async isNameAvailable(playerName)
    {
        let player = await PlayersModel.loadBy('name', playerName);
        return !!player;
    }

    async createPlayer(playerData)
    {
        let newPlayerModel = await PlayersModel.savePlayer(playerData);
        if(!newPlayerModel){
            return false;
        }
        await this.generatePlayerStats(newPlayerModel.id);
        return newPlayerModel;
    }

    async generatePlayerStats(playerId)
    {
        // save stats:
        let statsList = await StatsModel.loadAll();
        if (statsList){
            for (let stat of statsList){
                let statData = {
                    player_id: playerId,
                    stat_id: stat['id'],
                    base_value: stat['base_value'],
                    value: stat['base_value']
                };
                await PlayersStatsModel.query().insert(statData);
            }
        }
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
