/**
 *
 * Reldens - Test Admin Dashboard Chart Ticks
 *
 * Tests the admin dashboard stats renderer: the chart Y ticks by the maximum logged users, the stats loaded from the
 * current admin path (a custom admin route too) and refreshed by its interval without reloading, and the error state
 * of a failed stats request or an error answer.
 *
 */

const timersPromises = require('timers/promises');
const { BaseTest } = require('./base-test');
const { AdminBrowserScriptLoader } = require('./fixtures/admin-browser-script-loader');

class TestAdminDashboardChartTicks extends BaseTest
{

    createRenderer(contextValues = {})
    {
        return new (AdminBrowserScriptLoader.loadClass(
            'admin-dashboard-stats-renderer.js',
            'AdminDashboardStatsRenderer',
            Object.assign({window: {addEventListener: () => true}, document: {readyState: 'loading'}}, contextValues)
        ))();
    }

    createStatsPage(statsResponses)
    {
        let page = {requestedUrls: [], intervals: [], activeUsers: {textContent: ''}};
        page.container = {
            dataset: {statsPath: 'dashboard/stats', refreshMs: '5000'},
            querySelector: (selector) => '.active-users-count' === selector ? page.activeUsers : null
        };
        page.renderer = this.createRenderer({
            window: {addEventListener: () => true, location: {pathname: '/custom-admin/'}},
            document: {readyState: 'loading', querySelector: () => page.container},
            setInterval: (intervalCallback, delayMs) => page.intervals.push({intervalCallback, delayMs}),
            fetch: async (url) => {
                page.requestedUrls.push(url);
                return statsResponses.shift()();
            }
        });
        page.renderer.renderChart = () => true;
        page.renderer.bindChartHover = () => true;
        return page;
    }

    async testTheStatsAreLoadedFromTheAdminPathAndRefreshed()
    {
        await this.test('the stats load from the current admin path and refresh the active users without reload', async () => {
            let fromDate = '2026-10-14';
            let page = this.createStatsPage([
                async () => ({json: async () => ({activeUsersCount: 1, fromDate, daysRange: 30, dailyLoggedUsers: []})}),
                async () => ({json: async () => ({activeUsersCount: 2, fromDate, daysRange: 30, dailyLoggedUsers: []})})
            ]);
            page.renderer.bind();
            await timersPromises.setImmediate();
            let firstCount = page.activeUsers.textContent;
            page.intervals[0].intervalCallback();
            await timersPromises.setImmediate();
            this.assert.deepStrictEqual(
                [page.requestedUrls, page.intervals.map(interval => interval.delayMs), firstCount, page.activeUsers.textContent],
                [['/custom-admin/dashboard/stats', '/custom-admin/dashboard/stats'], [5000], '1', '2']
            );
        });
    }

    async testTheFailedStatsShowTheErrorState()
    {
        await this.test('a failed stats request or an error answer shows the error state', async () => {
            let failedRequest = new Error('Network error');
            let page = this.createStatsPage([
                async () => {
                    throw failedRequest;
                },
                async () => ({json: async () => ({error: true})})
            ]);
            page.renderer.bind();
            await timersPromises.setImmediate();
            let requestFailure = page.activeUsers.textContent;
            page.activeUsers.textContent = '';
            page.intervals[0].intervalCallback();
            await timersPromises.setImmediate();
            this.assert.deepStrictEqual([requestFailure, page.activeUsers.textContent], ['N/A', 'N/A']);
        });
    }

    async testTheTicksOfAMaximumOfOneAreDistinct()
    {
        await this.test('a maximum of 1 logged user draws the 0 and 1 ticks only', async () => {
            this.assert.deepStrictEqual([...this.createRenderer().fetchYTickValues(1)], [0, 1]);
        });
    }

    async testTheTicksOfAMaximumOfTwoAreDistinct()
    {
        await this.test('a maximum of 2 logged users draws one tick per user', async () => {
            this.assert.deepStrictEqual([...this.createRenderer().fetchYTickValues(2)], [0, 1, 2]);
        });
    }

    async testTheTicksOfAMaximumOfFourAreDistinct()
    {
        await this.test('a maximum of 4 logged users draws the configured 4 ticks', async () => {
            this.assert.deepStrictEqual([...this.createRenderer().fetchYTickValues(4)], [0, 1, 2, 3, 4]);
        });
    }

    async testTheTicksOfAMaximumOfTenAreDistinct()
    {
        await this.test('a maximum of 10 logged users draws the configured 4 ticks rounded', async () => {
            this.assert.deepStrictEqual([...this.createRenderer().fetchYTickValues(10)], [0, 3, 5, 8, 10]);
        });
    }

}

module.exports.TestAdminDashboardChartTicks = TestAdminDashboardChartTicks;
