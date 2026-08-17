/**
 *
 * Reldens - Test Users Activity Data Provider
 *
 */

const { BaseTest } = require('./base-test');
const { UsersActivityDataProvider } = require('../lib/admin/server/users-activity-data-provider');

class TestUsersActivityDataProvider extends BaseTest
{

    createProvider(queryResult, playersSessionsByUserId, capturedQueries = [])
    {
        return new UsersActivityDataProvider(
            {
                rawQuery: async (query) => {
                    capturedQueries.push(query);
                    return queryResult;
                },
                getEntity: () => {
                    return {tableName: () => 'users_login'};
                }
            },
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

    async testDailyLoggedUsersMapsTheGroupedRows()
    {
        await this.test('loadDailyLoggedUsers maps the grouped rows and casts the totals to numbers', async () => {
            let usersActivityDataProvider = this.createProvider(
                [{day: '2026-08-14', total: '3'}, {day: '2026-08-16', total: 7}],
                {}
            );
            let dailyLoggedUsers = await usersActivityDataProvider.loadDailyLoggedUsers('2026-07-18');
            this.assert.strictEqual(dailyLoggedUsers.length, 2);
            this.assert.deepStrictEqual([...dailyLoggedUsers].shift(), {date: '2026-08-14', count: 3});
            this.assert.deepStrictEqual([...dailyLoggedUsers].pop(), {date: '2026-08-16', count: 7});
        });
    }

    async testDailyLoggedUsersQueryGroupsByDayFromTheRangeStart()
    {
        await this.test('loadDailyLoggedUsers queries the login table grouped by day from the range start', async () => {
            let capturedQueries = [];
            let usersActivityDataProvider = this.createProvider([], {}, capturedQueries);
            await usersActivityDataProvider.loadDailyLoggedUsers('2026-07-18');
            this.assert.strictEqual(capturedQueries.length, 1);
            let executedQuery = [...capturedQueries].shift();
            this.assert.strictEqual(-1 !== executedQuery.indexOf('FROM users_login'), true);
            this.assert.strictEqual(-1 !== executedQuery.indexOf('COUNT(DISTINCT user_id)'), true);
            this.assert.strictEqual(-1 !== executedQuery.indexOf('GROUP BY day'), true);
            this.assert.strictEqual(-1 !== executedQuery.indexOf('2026-07-18 00:00:00'), true);
        });
    }

    async testDailyLoggedUsersReturnsEmptyOnQueryFailure()
    {
        await this.test('loadDailyLoggedUsers returns an empty list when the query fails', async () => {
            let usersActivityDataProvider = this.createProvider(false, {});
            let dailyLoggedUsers = await usersActivityDataProvider.loadDailyLoggedUsers('2026-07-18');
            this.assert.deepStrictEqual(dailyLoggedUsers, []);
        });
    }

    async testFetchStatsReturnsTheRangeAndTheGroupedRows()
    {
        await this.test('fetchStats returns the active count, the range start date and the grouped rows', async () => {
            let usersActivityDataProvider = this.createProvider(
                [{day: '2026-08-16', total: 2}],
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
