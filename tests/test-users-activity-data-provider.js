/**
 *
 * Reldens - Test Users Activity Data Provider
 *
 */

const { BaseTest } = require('./base-test');
const { UsersActivityDataProvider } = require('../lib/admin/server/users-activity-data-provider');

class TestUsersActivityDataProvider extends BaseTest
{

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

    createProvider(loginRows, playersSessionsByUserId, capturedFilters = [])
    {
        return new UsersActivityDataProvider(
            {getEntity: () => this.createUsersLoginRepository(loginRows, capturedFilters)},
            {playersSessionsByUserId},
            30
        );
    }

    async testCountActiveUsersIgnoresEmptySessions()
    {
        await this.test('countActiveUsers counts only users with at least one open session', async () => {
            let usersActivityDataProvider = this.createProvider([], {
                1: {sessionA: 'roomIdA', sessionB: 'roomIdB'},
                2: {},
                3: {sessionC: 'roomIdA'}
            });
            this.assert.strictEqual(usersActivityDataProvider.countActiveUsers(), 2);
        });
    }

    async testDailyLoggedUsersGroupsDistinctUsersPerDay()
    {
        await this.test('loadDailyLoggedUsers counts each user once per day', async () => {
            let usersActivityDataProvider = this.createProvider(
                [
                    {user_id: 1, login_date: new Date('2026-08-14T10:00:00.000Z')},
                    {user_id: 1, login_date: new Date('2026-08-14T22:00:00.000Z')},
                    {user_id: 2, login_date: new Date('2026-08-14T11:00:00.000Z')},
                    {user_id: 3, login_date: '2026-08-16 09:00:00'}
                ],
                {}
            );
            let dailyLoggedUsers = await usersActivityDataProvider.loadDailyLoggedUsers('2026-07-18');
            this.assert.strictEqual(dailyLoggedUsers.length, 2);
            this.assert.deepStrictEqual([...dailyLoggedUsers].shift(), {date: '2026-08-14', count: 2});
            this.assert.deepStrictEqual([...dailyLoggedUsers].pop(), {date: '2026-08-16', count: 1});
        });
    }

    async testDailyLoggedUsersFiltersFromTheRangeStart()
    {
        await this.test('loadDailyLoggedUsers filters the login date from the range start', async () => {
            let capturedFilters = [];
            let usersActivityDataProvider = this.createProvider([], {}, capturedFilters);
            await usersActivityDataProvider.loadDailyLoggedUsers('2026-07-18');
            this.assert.strictEqual(capturedFilters.length, 1);
            let executedFilter = [...capturedFilters].shift();
            this.assert.strictEqual(executedFilter.field, 'login_date');
            this.assert.strictEqual(executedFilter.operator, 'GTE');
            this.assert.strictEqual(executedFilter.fieldValue.toISOString(), '2026-07-18T00:00:00.000Z');
        });
    }

    async testDailyLoggedUsersReturnsEmptyOnLoadFailure()
    {
        await this.test('loadDailyLoggedUsers returns an empty list when the rows could not be loaded', async () => {
            let usersActivityDataProvider = this.createProvider(false, {});
            let dailyLoggedUsers = await usersActivityDataProvider.loadDailyLoggedUsers('2026-07-18');
            this.assert.deepStrictEqual(dailyLoggedUsers, []);
        });
    }

    async testFetchStatsReturnsTheRangeAndTheGroupedRows()
    {
        await this.test('fetchStats returns the active count, the range start date and the grouped rows', async () => {
            let usersActivityDataProvider = this.createProvider(
                [{user_id: 1, login_date: new Date('2026-08-16T09:00:00.000Z')}],
                {1: {sessionA: 'roomIdA'}}
            );
            let stats = await usersActivityDataProvider.fetchStats();
            this.assert.strictEqual(stats.activeUsersCount, 1);
            this.assert.strictEqual(stats.daysRange, 30);
            this.assert.strictEqual(stats.fromDate, usersActivityDataProvider.rangeStartDate());
            this.assert.strictEqual(stats.dailyLoggedUsers.length, 1);
        });
    }

    async testRangeStartDateIsTheFirstUtcDayOfTheRange()
    {
        await this.test('rangeStartDate returns the first UTC day of the range, matching the stored dates', async () => {
            let usersActivityDataProvider = this.createProvider([], {});
            let expectedDate = new Date();
            expectedDate.setUTCHours(0, 0, 0, 0);
            expectedDate.setUTCDate(expectedDate.getUTCDate() - 29);
            this.assert.strictEqual(usersActivityDataProvider.rangeStartDate(), expectedDate.toISOString().slice(0, 10));
        });
    }

}

module.exports.TestUsersActivityDataProvider = TestUsersActivityDataProvider;
