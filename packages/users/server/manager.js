/**
 *
 * Reldens - UsersManager
 *
 */

const { ErrorManager, Logger, sc } = require('@reldens/utils');

class UsersManager
{

    constructor(props)
    {
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in UsersManager.');
        }
        this.dataServer = sc.get(props, 'dataServer', false);
        if(!this.dataServer){
            Logger.error('DataServer undefined in UsersManager.');
        }
    }

    async loadUserByUsername(username)
    {
        let result = false;
        if(!username){
            ErrorManager.error('Missing user name.');
        }
        let loadedUser = await this.dataServer.getEntity('users')
            .loadOneByWithRelations('username', username, ['players.[state]']);
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
        let loadedUser = await this.dataServer.getEntity('users')
            .loadOneByWithRelations('email', email, ['players.[state]']);
        if(loadedUser){
            result = loadedUser;
        }
        return result;
    }

    async createUser(userData)
    {
        return await this.dataServer.getEntity('users').createWithRelations(userData);
    }

    async isNameAvailable(playerName)
    {
        let player = await this.dataServer.getEntity('players').loadOneBy('playerName', playerName);
        return !!player;
    }

    async createPlayer(playerData)
    {
        let newPlayerModel = await this.dataServer.getEntity('players').createWithRelations(playerData);
        if(!newPlayerModel){
            return false;
        }
        await this.generatePlayerStats(newPlayerModel.id);
        return newPlayerModel;
    }

    async generatePlayerStats(playerId)
    {
        let statsList = await this.dataServer.getEntity('stats').loadAll();
        if(0 < statsList.length){
            for(let stat of statsList){
                let statData = {
                    player_id: playerId,
                    stat_id: stat['id'],
                    base_value: stat['base_value'],
                    value: stat['base_value']
                };
                await this.dataServer.getEntity('playerStats').create(statData);
            }
        }
    }

    updateUserLastLogin(username)
    {
        return this.dataServer.getEntity('users').updateBy('username', username, {updated_at: sc.getCurrentDate()});
    }

    updateUserByEmail(email, updatePatch)
    {
        return this.dataServer.getEntity('users').updateBy('email', email, updatePatch);
    }

    updateUserStateByPlayerId(playerId, newState)
    {
        return this.dataServer.getEntity('playerState').updateBy('player_id', playerId, newState);
    }

    async updatePlayerStatByIds(playerId, statId, statPatch)
    {
        return this.dataServer.getEntity('playerStats').update({player_id: playerId, stat_id: statId}, statPatch);
    }

}

module.exports.UsersManager = UsersManager;
