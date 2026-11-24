/**
 *
 * Reldens - Test Users Activity Data Provider
 *
 * Tests the admin users activity data in the server local time (the login dates are stored in local time, the test
 * dates are built with the local Date constructor): the active users count of every server (RoomsAvailability), every user counted once per local day (a
 * login in the first local hour of a day counts on that day), the login date filter from the local midnight of the
 * range start, the empty list on a failed load, the stats and the first local day of the range.
 *
 */

const { BaseTest } = require('./base-test');
const { UsersActivityDataProvider } = require('../lib/admin/server/users-activity-data-provider');

class TestUsersActivityDataProvider extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.daysRange = 30;
    }

    createUsersLoginRepository(loginRows, capturedFilters)
    {
        return {
            tableName: () => 'users_login',
            loadBy: async (field, fieldValue, operator) => {
                capturedFilters.push({field, fieldValue, operator});
                return loginRows;
            }
        };
    }

    createProvider(loginRows, activeUsersCount, capturedFilters = [])
    {
        return new UsersActivityDataProvider({
            dataServer: {getEntity: () => this.createUsersLoginRepository(loginRows, capturedFilters)},
            roomsAvailability: {countActiveUsers: async () => activeUsersCount},
            daysRange: this.daysRange
        });
    }

    expectedRangeStart()
    {
        let rangeStart = new Date((new Date()).toDateString());
        rangeStart.setDate(rangeStart.getDate() - (this.daysRange - 1));
        return rangeStart;
    }

    async testDailyLoggedUsersGroupsDistinctUsersPerDay()
    {
        await this.test('loadDailyLoggedUsers counts each user once per local day, its first local hour included', async () => {
            let usersActivityDataProvider = this.createProvider(
                [
                    {user_id: 1, login_date: new Date(2026, 7, 14, 10, 0, 0)},
                    {user_id: 1, login_date: new Date(2026, 7, 14, 23, 59, 0)},
                    {user_id: 2, login_date: new Date(2026, 7, 14, 11, 0, 0)},
                    {user_id: 2, login_date: new Date(2026, 7, 15, 0, 30, 0)},
                    {user_id: 3, login_date: '2026-08-16 09:00:00'}
                ],
                0
            );
            this.assert.deepStrictEqual(await usersActivityDataProvider.loadDailyLoggedUsers(new Date(2026, 6, 18)), [
                {date: '2026-08-14', count: 2},
                {date: '2026-08-15', count: 1},
                {date: '2026-08-16', count: 1}
            ]);
        });
    }

    async testDailyLoggedUsersFiltersFromTheRangeStart()
    {
        await this.test('loadDailyLoggedUsers filters the login date from the local midnight of the range start', async () => {
            let capturedFilters = [];
            let usersActivityDataProvider = this.createProvider([], 0, capturedFilters);
            await usersActivityDataProvider.loadDailyLoggedUsers(new Date(2026, 6, 18));
            this.assert.strictEqual(capturedFilters.length, 1);
            let executedFilter = [...capturedFilters].shift();
            this.assert.deepStrictEqual(
                [executedFilter.field, executedFilter.operator, executedFilter.fieldValue.getTime()],
                ['login_date', 'GTE', new Date(2026, 6, 18, 0, 0, 0).getTime()]
            );
        });
    }

    async testDailyLoggedUsersReturnsEmptyOnLoadFailure()
    {
        await this.test('loadDailyLoggedUsers returns an empty list when the rows could not be loaded or there is no storage', async () => {
            let failedLoadProvider = this.createProvider(false, 0);
            let noStorageProvider = this.createProvider([], 0);
            noStorageProvider.usersLoginRepository = false;
            this.assert.deepStrictEqual(
                [
                    await failedLoadProvider.loadDailyLoggedUsers(new Date(2026, 6, 18)),
                    await noStorageProvider.loadDailyLoggedUsers(new Date(2026, 6, 18))
                ],
                [[], []]
            );
        });
    }

    async testFetchStatsReturnsTheRangeAndTheGroupedRows()
    {
        await this.test('fetchStats returns the every servers active count, the range start day and the grouped rows', async () => {
            let usersActivityDataProvider = this.createProvider(
                [{user_id: 1, login_date: new Date('2026-08-16T09:00:00.000Z')}],
                3
            );
            let stats = await usersActivityDataProvider.fetchStats();
            let rangeStart = this.expectedRangeStart();
            this.assert.deepStrictEqual(
                [stats.activeUsersCount, stats.daysRange, stats.fromDate, stats.dailyLoggedUsers.length],
                [
                    3,
                    this.daysRange,
                    [
                        rangeStart.getFullYear(),
                        String(rangeStart.getMonth() + 1).padStart(2, '0'),
                        String(rangeStart.getDate()).padStart(2, '0')
                    ].join('-'),
                    1
                ]
            );
        });
    }

    async testRangeStartDateIsTheFirstLocalDayOfTheRange()
    {
        await this.test('rangeStartDate returns the local midnight of the first day of the range', async () => {
            let usersActivityDataProvider = this.createProvider([], 0);
            this.assert.strictEqual(
                usersActivityDataProvider.rangeStartDate().getTime(),
                this.expectedRangeStart().getTime()
            );
        });
    }

}

module.exports.TestUsersActivityDataProvider = TestUsersActivityDataProvider;
