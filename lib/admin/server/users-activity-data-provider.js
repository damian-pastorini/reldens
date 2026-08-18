/**
 *
 * Reldens - UsersActivityDataProvider
 *
 * Provides the dashboard activity data: the currently logged users count from the ActivePlayers registry
 * and the distinct logged users per day, grouped by the database over the requested days range.
 *
 */

const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/storage').BaseDataServer} BaseDataServer
 * @typedef {import('../../game/server/memory/active-players')} ActivePlayers
 */
class UsersActivityDataProvider
{

    /**
     * @param {BaseDataServer|boolean} dataServer
     * @param {ActivePlayers|boolean} activePlayers
     * @param {number} [daysRange]
     */
    constructor(dataServer, activePlayers, daysRange = 30)
    {
        /** @type {BaseDataServer|boolean} */
        this.dataServer = dataServer;
        /** @type {ActivePlayers|boolean} */
        this.activePlayers = activePlayers;
        /** @type {number} */
        this.daysRange = Number(daysRange);
        /** @type {Object|boolean} */
        this.usersLoginRepository = this.dataServer?.getEntity('usersLogin');
    }

    /**
     * @returns {Promise<Object>}
     */
    async fetchStats()
    {
        let fromDate = this.rangeStartDate();
        return {
            activeUsersCount: this.countActiveUsers(),
            daysRange: this.daysRange,
            fromDate,
            dailyLoggedUsers: await this.loadDailyLoggedUsers(fromDate)
        };
    }

    /**
     * @returns {number}
     */
    countActiveUsers()
    {
        if(!this.activePlayers){
            Logger.error('ActivePlayers is not available in UsersActivityDataProvider.');
            return 0;
        }
        let sessionsByUserId = sc.get(this.activePlayers, 'playersSessionsByUserId', {});
        let activeUsersCount = 0;
        for(let userId of Object.keys(sessionsByUserId)){
            if(0 < Object.keys(sessionsByUserId[userId]).length){
                activeUsersCount++;
            }
        }
        return activeUsersCount;
    }

    /**
     * @param {string} fromDate
     * @returns {Promise<Array<Object>>}
     */
    async loadDailyLoggedUsers(fromDate)
    {
        if(!this.usersLoginRepository){
            Logger.error('UsersLogin repository is not available in UsersActivityDataProvider.');
            return [];
        }
        let loginRows = await this.usersLoginRepository.loadBy(
            'login_date',
            new Date(fromDate+'T00:00:00.000Z'),
            'GTE'
        );
        if(!sc.isArray(loginRows)){
            Logger.warning('Daily logged users could not be loaded.', loginRows);
            return [];
        }
        return this.groupDistinctUsersPerDay(loginRows);
    }

    /**
     * @param {Array<Object>} loginRows
     * @returns {Array<Object>}
     */
    groupDistinctUsersPerDay(loginRows)
    {
        let usersPerDay = {};
        for(let loginRow of loginRows){
            let loginDay = this.fetchLoginDay(loginRow.login_date);
            if(!usersPerDay[loginDay]){
                usersPerDay[loginDay] = [];
            }
            if(-1 === usersPerDay[loginDay].indexOf(loginRow.user_id)){
                usersPerDay[loginDay].push(loginRow.user_id);
            }
        }
        let dailyLoggedUsers = [];
        for(let loginDay of Object.keys(usersPerDay).sort()){
            dailyLoggedUsers.push({date: loginDay, count: usersPerDay[loginDay].length});
        }
        return dailyLoggedUsers;
    }

    /**
     * @param {Date|string} loginDate
     * @returns {string}
     */
    fetchLoginDay(loginDate)
    {
        if(loginDate instanceof Date){
            return loginDate.toISOString().slice(0, 10);
        }
        return String(loginDate).slice(0, 10);
    }

    /**
     * @returns {string}
     */
    rangeStartDate()
    {
        let rangeStartDate = new Date();
        rangeStartDate.setUTCHours(0, 0, 0, 0);
        rangeStartDate.setUTCDate(rangeStartDate.getUTCDate() - (this.daysRange - 1));
        return rangeStartDate.toISOString().slice(0, 10);
    }

}

module.exports.UsersActivityDataProvider = UsersActivityDataProvider;
