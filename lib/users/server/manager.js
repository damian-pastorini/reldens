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
        this.setRepositories();
    }

    setRepositories()
    {
        if(!this.dataServer){
            return false;
        }
        this.statsRepository = this.dataServer.getEntity('stats');
        this.usersRepository = this.dataServer.getEntity('users');
        this.playersRepository = this.dataServer.getEntity('players');
        this.playerStatsRepository = this.dataServer.getEntity('playerStats');
        this.playerStateRepository = this.dataServer.getEntity('playerState');
    }

    async fetchUserByNameOrEmail(username, email)
    {
        let result = await this.loadUserByUsername(username);
        if(result){
            return result;
        }
        return await this.loadUserByEmail(email);
    }

    async loadUserByUsername(username)
    {
        let result = false;
        if(!username){
            ErrorManager.error('Missing user name.');
        }
        let loadedUser = await this.usersRepository
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
        let loadedUser = await this.usersRepository.loadOneByWithRelations(
            'email',
            email,
            ['players.[state]']
        );
        if(loadedUser){
            result = loadedUser;
        }
        return result;
    }

    async createUser(userData)
    {
        return await this.usersRepository.createWithRelations(userData);
    }

    async isNameAvailable(playerName)
    {
        return await this.playersRepository.loadOneBy('name', playerName)?.name;
    }

    async createPlayer(playerData)
    {
        let newPlayerModel = await this.playersRepository.createWithRelations(playerData);
        if(!newPlayerModel){
            return false;
        }
        await this.generatePlayerStats(newPlayerModel.id);
        return newPlayerModel;
    }

    async generatePlayerStats(playerId)
    {
        let statsList = await this.statsRepository.loadAll();
        if(0 < statsList.length){
            for(let stat of statsList){
                let statData = {
                    player_id: playerId,
                    stat_id: stat['id'],
                    base_value: stat['base_value'],
                    value: stat['base_value']
                };
                await this.playerStatsRepository.create(statData);
            }
        }
    }

    updateUserLastLogin(username)
    {
        return this.usersRepository.updateBy('username', username, {updated_at: sc.getCurrentDate()});
    }

    updateUserByEmail(email, updatePatch)
    {
        return this.usersRepository.updateBy('email', email, updatePatch);
    }

    updateUserStateByPlayerId(playerId, newState)
    {
        return this.playerStateRepository.updateBy('player_id', playerId, newState);
    }

    async updatePlayerStatByIds(playerId, statId, statPatch)
    {
        return this.playerStatsRepository.update({player_id: playerId, stat_id: statId}, statPatch);
    }

}

module.exports.UsersManager = UsersManager;
