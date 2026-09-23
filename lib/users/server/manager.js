/**
 *
 * Reldens - UsersManager
 *
 * User and player management service for authentication, creation, and state tracking.
 *
 */

const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('@reldens/storage').BaseDataServer} BaseDataServer
 * @typedef {import('../../game/server/config-manager').ConfigManager} ConfigManager
 */
class UsersManager
{

    /**
     * @param {Object} props
     */
    constructor(props)
    {
        /** @type {EventsManager|boolean} */
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in UsersManager.');
        }
        /** @type {BaseDataServer|boolean} */
        this.dataServer = sc.get(props, 'dataServer', false);
        if(!this.dataServer){
            Logger.error('DataServer undefined in UsersManager.');
        }
        /** @type {ConfigManager|boolean} */
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
        this.playerStatsRepository = this.dataServer.getEntity('playersStats');
        this.playerStateRepository = this.dataServer.getEntity('playersState');
        this.usersLocaleRepository = this.dataServer.getEntity('usersLocale');
        this.questsProgressRepository = this.dataServer.getEntity('questsProgress');
        this.clanRepository = this.dataServer.getEntity('clan');
        this.usersPasswordResetsRepository = this.dataServer.getEntity('usersPasswordResets');
    }

    /**
     * @param {number} userId
     * @returns {Promise<number>}
     */
    async fetchPasswordResetSentTime(userId)
    {
        if(!this.usersPasswordResetsRepository){
            Logger.critical('The "usersPasswordResets" entity is missing, run the entities generation.');
            return 0;
        }
        let passwordReset = await this.usersPasswordResetsRepository.loadOneBy('user_id', userId);
        if(!passwordReset){
            return 0;
        }
        return new Date(passwordReset.sent_at).getTime();
    }

    /**
     * @param {number} userId
     * @param {number} sentTime
     * @returns {Promise<Object|boolean>}
     */
    async savePasswordResetSentTime(userId, sentTime)
    {
        if(!this.usersPasswordResetsRepository){
            return false;
        }
        return await this.usersPasswordResetsRepository.upsert(
            {user_id: userId, sent_at: sc.formatDate(new Date(sentTime))},
            {user_id: userId}
        );
    }

    /**
     * @param {number} guestRoleId
     * @param {number} olderThanTime
     * @returns {Promise<Array<Object>>}
     */
    async loadGuestsOlderThan(guestRoleId, olderThanTime)
    {
        return (await this.usersRepository.loadByWithRelations('role_id', guestRoleId, ['related_players']))
            .filter((guestUser) => new Date(guestUser.updated_at).getTime() < olderThanTime);
    }

    /**
     * @param {Array<number>} playerIds
     * @returns {Promise<boolean>}
     */
    async hasClanOwner(playerIds)
    {
        for(let playerId of playerIds){
            if(await this.clanRepository.loadOneBy('owner_id', playerId)){
                return true;
            }
        }
        return false;
    }

    /**
     * @param {Object} guestUser
     * @returns {Promise<boolean>}
     */
    async deleteGuestUser(guestUser)
    {
        let playerIds = sc.isArray(guestUser.related_players)
            ? guestUser.related_players.map((relatedPlayer) => relatedPlayer.id)
            : [];
        if(await this.hasClanOwner(playerIds)){
            Logger.info('Skipped guest deletion, a player owns a clan.', {userId: guestUser.id});
            return false;
        }
        await this.usersLoginRepository.delete({user_id: guestUser.id});
        await this.usersLocaleRepository.delete({user_id: guestUser.id});
        for(let playerId of playerIds){
            await this.questsProgressRepository.delete({player_id: playerId});
            await this.playersRepository.deleteById(playerId);
        }
        await this.usersRepository.deleteById(guestUser.id);
        return true;
    }

    /**
     * @param {string} username
     * @returns {Promise<Object|boolean>}
     */
    async loadUserByUsername(username)
    {
        if(!username){
            Logger.critical('Missing user name.');
            return false;
        }
        return await this.loadUserByProperty('username', username);
    }

    /**
     * @param {string} email
     * @returns {Promise<Object|boolean>}
     */
    async loadUserByEmail(email)
    {
        if(!email){
            Logger.critical('Missing email.');
            return false;
        }
        return await this.loadUserByProperty('email', email);
    }

    /**
     * @param {string} propertyKey
     * @param {string} propertyValue
     * @returns {Promise<Object|boolean>}
     */
    async loadUserByProperty(propertyKey, propertyValue)
    {
        // @TODO - BETA - Replace the login association with a call to the usersLogin repository with a limit.
        let loadedUser = await this.usersRepository.loadOneByWithRelations(
            propertyKey,
            propertyValue,
            ['related_users_login', 'related_players.related_players_state']
        );
        if(!loadedUser){
            return false;
        }
        return loadedUser;
    }

    /**
     * @param {Object} userData
     * @returns {Promise<Object>}
     */
    async createUser(userData)
    {
        return await this.usersRepository.create(userData);
    }

    /**
     * @param {string} playerName
     * @returns {Promise<boolean>}
     */
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
        return !(await this.playersRepository.loadOneBy('name', playerName))?.name;
    }

    /**
     * @param {string} playerName
     * @returns {Promise<boolean>}
     */
    async isAvailableForGuest(playerName)
    {
        let playersByName = await this.playersRepository.loadByWithRelations('name', playerName, ['related_users']);
        for(let player of playersByName){
            if(this.guestRoleId !== player.related_users.role_id){
                return false;
            }
        }
        return true;
    }

    /**
     * @param {Object} playerData
     * @returns {Promise<Object|boolean>}
     */
    async createPlayer(playerData)
    {
        let stateData = sc.get(playerData, 'state', null);
        let playerInsertData = {
            name: playerData.name,
            user_id: playerData.user_id
        };
        let newPlayerModel = await this.playersRepository.create(playerInsertData);
        if(!newPlayerModel){
            return false;
        }
        if(stateData){
            let stateInsertData = Object.assign({}, stateData, {player_id: newPlayerModel.id});
            let createdState = await this.playerStateRepository.create(stateInsertData);
            if(createdState){
                newPlayerModel.related_players_state = createdState;
            }
        }
        await this.generatePlayerStats(newPlayerModel.id);
        return newPlayerModel;
    }

    /**
     * @param {number} playerId
     * @returns {Promise<boolean>}
     */
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

    /**
     * @param {Object} userModel
     * @returns {Promise<Object|boolean>}
     */
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
            Logger.error('Update user last login error: '+error.message, {userId: userModel.id});
        }
        return false;
    }

    /**
     * @param {Object} playerSchema
     * @returns {Promise<Object|boolean>}
     */
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

    /**
     * @param {string} email
     * @param {Object} updatePatch
     * @returns {Promise<Object>}
     */
    updateUserByEmail(email, updatePatch)
    {
        return this.usersRepository.updateBy('email', email, updatePatch);
    }

    /**
     * @param {number} playerId
     * @param {Object} newState
     * @returns {Promise<Object>}
     */
    updateUserStateByPlayerId(playerId, newState)
    {
        return this.playerStateRepository.updateBy('player_id', playerId, newState);
    }

    /**
     * @param {number} playerId
     * @param {number} statId
     * @param {Object} statPatch
     * @returns {Promise<Object>}
     */
    async updatePlayerStatByIds(playerId, statId, statPatch)
    {
        return this.playerStatsRepository.update({player_id: playerId, stat_id: statId}, statPatch);
    }

}

module.exports.UsersManager = UsersManager;
