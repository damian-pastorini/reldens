/**
 *
 * Reldens - Test Group Hot Plug Callbacks
 *
 */

const { BaseTest } = require('./base-test');
const { GroupHotPlugCallbacks } = require('../lib/inventory/server/group-hot-plug-callbacks');

class TestGroupHotPlugCallbacks extends BaseTest
{

    async testHotPlugDisabledRegistersNoCallbacks()
    {
        await this.test('with the hot plug disabled the items group edits register no live callbacks', async () => {
            let projectConfig = {isHotPlugEnabled: false};
            this.assert.deepStrictEqual(
                [
                    GroupHotPlugCallbacks.afterUpdateCallback(projectConfig, 'bucket', 'dist'),
                    GroupHotPlugCallbacks.beforeDeleteCallback(projectConfig, 'bucket', 'dist')
                ],
                [false, false]
            );
        });
    }

}

module.exports.TestGroupHotPlugCallbacks = TestGroupHotPlugCallbacks;
