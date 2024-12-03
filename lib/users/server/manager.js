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
        this.config = sc.get(props, 'config', false);
        this.setGuestRoleId();
        this.setRepositories();
    }

    setGuestRoleId()
    {
        this.guestRoleId = Number(this.config?.server?.players?.guestUser?.roleId || 0);
        if(0 === this.guestRoleId){
            Logger.warning('Guest role ID is undefined.');
        }
        this.allowDuplicateGuestNames = Boolean(this.config?.server?.players?.allowDuplicateGuestNames || true);
        this.bannedNames = String(this.config?.server?.players?.bannedNames || '');
    }

    setRepositories()
    {
        if(!this.dataServer){
            return false;
        }
        this.statsRepository = this.dataServer.getEntity('stats');
        this.usersRepository = this.dataServer.getEntity('users');
        this.usersLoginRepository = this.dataServer.getEntity('usersLogin');
        this.playersRepository = this.dataServer.getEntity('players');
        this.playerStatsRepository = this.dataServer.getEntity('playerStats');
        this.playerStateRepository = this.dataServer.getEntity('playerState');
    }

    async loadUserByUsername(username)
    {
        let result = false;
        if(!username){
            ErrorManager.error('Missing user name.');
        }
        // @TODO - BETA - Replace the login association with a call to the usersLogin repository with a limit.
        let loadedUser = await this.usersRepository.loadOneByWithRelations(
            'username',
            username,
            ['login', 'players.[state]']
        );
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
        // @TODO - BETA - Replace the login association with a call to the usersLogin repository with a limit.
        let loadedUser = await this.usersRepository.loadOneByWithRelations(
            'email',
            email,
            ['login', 'players.[state]']
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
        if(-1 !== this.bannedNames.indexOf(playerName)){
            Logger.debug('Banned name: '+playerName);
            return false;
        }
        if(this.allowDuplicateGuestNames){
            Logger.debug('Allow duplicate guest names.');
            return await this.isAvailableForGuest(playerName);
        }
        let foundPlayer = await this.playersRepository.loadOneBy('name', playerName);
        return !foundPlayer?.name;
    }

    async isAvailableForGuest(playerName)
    {
        let playersByName = await this.playersRepository.loadByWithRelations('name', playerName, ['parent_user']);
        for(let player of playersByName){
            if(this.guestRoleId !== player.parent_user.role_id){
                return false;
            }
        }
        return true;
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
        if(0 === statsList.length){
            return false;
        }
        for(let stat of statsList){
            let statData = {
                player_id: playerId,
                stat_id: stat['id'],
                base_value: stat['base_value'],
                value: stat['base_value']
            };
            await this.playerStatsRepository.create(statData);
        }
        return true;
    }

    async updateUserLastLogin(userModel)
    {
        try {
            let currentDate = sc.getCurrentDate();
            await this.usersLoginRepository.create({user_id: userModel.id, login_date: currentDate});
            return this.usersRepository.updateById(userModel.id, {
                updated_at: currentDate,
                login_count: Number(userModel.login_count || 0) + 1
            });
        } catch (error) {
            Logger.error('Update user last login error.', error.message, userModel);
        }
        return false;
    }

    async updatePlayedTimeAndLogoutDate(playerSchema)
    {
        if(!playerSchema){
            //Logger.debug('Missing player schema to update played time and logout date.');
            return false;
        }
        let currentlyPlayedTime = (Date.now() - playerSchema.playStartTime) / 1000;
        let playedTime = Number(playerSchema.playedTime)+Number(Number(currentlyPlayedTime).toFixed(0));
        playerSchema.playedTime = playedTime;
        let updateResult = await this.usersRepository.updateById(
            playerSchema.userId,
            {played_time: playedTime}
        );
        if(!updateResult){
            Logger.critical('User played time update error.', playerSchema.player_id);
        }
        this.usersLoginRepository.sortBy = 'login_date';
        this.usersLoginRepository.sortDirection = 'DESC';
        let lastLogin = await this.usersLoginRepository.loadOneBy('user_id', playerSchema.userId);
        this.usersLoginRepository.sortBy = false;
        this.usersLoginRepository.sortDirection = false;
        await this.usersLoginRepository.updateById(lastLogin.id, {logout_date: sc.getCurrentDate()});
        return playerSchema;
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
