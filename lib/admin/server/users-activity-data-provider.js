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
        if(!this.dataServer){
            Logger.error('DataServer was not provided in UsersActivityDataProvider.');
        }
        /** @type {ActivePlayers|boolean} */
        this.activePlayers = activePlayers;
        if(!this.activePlayers){
            Logger.error('ActivePlayers was not provided in UsersActivityDataProvider.');
        }
        /** @type {number} */
        this.daysRange = Number(daysRange);
        /** @type {Object|boolean} */
        this.usersLoginRepository = this.dataServer ? this.dataServer.getEntity('usersLogin') : false;
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
            return [];
        }
        let queryResult = await this.dataServer.rawQuery(
            'SELECT DATE_FORMAT(login_date, \'%Y-%m-%d\') AS day, COUNT(DISTINCT user_id) AS total'
            +' FROM '+this.usersLoginRepository.tableName()
            +' WHERE login_date >= \''+fromDate+' 00:00:00\''
            +' GROUP BY day ORDER BY day ASC;'
        );
        if(!sc.isArray(queryResult)){
            Logger.warning('Daily logged users query did not return rows.', queryResult);
            return [];
        }
        let dailyLoggedUsers = [];
        for(let row of queryResult){
            dailyLoggedUsers.push({date: row.day, count: Number(row.total)});
        }
        return dailyLoggedUsers;
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
