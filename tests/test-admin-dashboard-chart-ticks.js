/**
 *
 * Reldens - Test Admin Dashboard Chart Ticks
 *
 */

const vm = require('node:vm');
const { BaseTest } = require('./base-test');
const { FileHandler } = require('@reldens/server-utils');

class TestAdminDashboardChartTicks extends BaseTest
{

    createRenderer()
    {
        return new (vm.runInContext(
            FileHandler.readFile(
                FileHandler.joinPaths(process.cwd(), 'theme', 'admin', 'js', 'admin-dashboard-stats-renderer.js')
            )+'\nAdminDashboardStatsRenderer;',
            vm.createContext({window: {addEventListener: () => true}, document: {readyState: 'loading'}})
        ))();
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
