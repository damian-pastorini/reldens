/**
 *
 * Reldens - UsersActivityDataProvider
 *
 * Provides the dashboard activity data: the logged users count of every server (a user logged on several servers is
 * counted once, RoomsAvailability.countActiveUsers) and the distinct logged users per day over the requested days range.
 *
 */

const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/storage').BaseDataServer} BaseDataServer
 * @typedef {import('../../game/server/health/rooms-availability').RoomsAvailability} RoomsAvailability
 *
 * @typedef {Object} UsersActivityDataProviderProps
 * @property {BaseDataServer|boolean} dataServer
 * @property {RoomsAvailability} roomsAvailability
 * @property {number} daysRange
 */
class UsersActivityDataProvider
{

    /**
     * @param {UsersActivityDataProviderProps} props
     */
    constructor(props)
    {
        /** @type {BaseDataServer|boolean} */
        this.dataServer = props.dataServer;
        /** @type {RoomsAvailability} */
        this.roomsAvailability = props.roomsAvailability;
        /** @type {number} */
        this.daysRange = props.daysRange;
        /** @type {Object|boolean} */
        this.usersLoginRepository = this.dataServer?.getEntity('usersLogin');
    }

    /**
     * @returns {Promise<Object>}
     */
    async fetchStats()
    {
        let fromDate = this.rangeStartDate();
        let stats = {
            activeUsersCount: await this.roomsAvailability.countActiveUsers(),
            daysRange: this.daysRange,
            fromDate: sc.formatDate(fromDate, 'Y-m-d'),
            dailyLoggedUsers: []
        };
        stats.dailyLoggedUsers = await this.loadDailyLoggedUsers(fromDate);
        return stats;
    }

    /**
     * @param {Date} fromDate
     * @returns {Promise<Array<Object>>}
     */
    async loadDailyLoggedUsers(fromDate)
    {
        if(!this.usersLoginRepository){
            Logger.error('UsersLogin repository is not available in UsersActivityDataProvider.');
            return [];
        }
        let loginRows = await this.usersLoginRepository.loadBy('login_date', fromDate, 'GTE');
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
            return sc.formatDate(loginDate, 'Y-m-d');
        }
        return String(loginDate).slice(0, 10);
    }

    /**
     * @returns {Date}
     */
    rangeStartDate()
    {
        let rangeStartDate = new Date();
        rangeStartDate.setHours(0, 0, 0, 0);
        rangeStartDate.setDate(rangeStartDate.getDate() - (this.daysRange - 1));
        return rangeStartDate;
    }

}

module.exports.UsersActivityDataProvider = UsersActivityDataProvider;
