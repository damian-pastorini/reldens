/**
 *
 * Reldens - Test Server Startup Report
 *
 */

const { BaseTest } = require('./base-test');
const { ServerStartupReport } = require('../lib/game/server/server-startup-report');
const { ConfigManager } = require('../lib/config/server/manager');

class TestServerStartupReport extends BaseTest
{

    createServerStartupReport(adminRoleId, loadedRoles)
    {
        return new ServerStartupReport({
            configManager: new ConfigManager({
                environmentConfig: {monitor: {enabled: false, auth: false}, admin: {roleId: adminRoleId}}
            }),
            usersRepository: {
                loadBy: async (field, value) => {
                    loadedRoles.push(field+':'+value);
                    return [];
                }
            }
        });
    }

    async testTheAdministratorsAreNotLoadedWithoutTheAdminRole()
    {
        await this.test('the administrators are not loaded when the admin role id is not configured', async () => {
            let loadedRoles = [];
            let serverStartupReport = this.createServerStartupReport(0, loadedRoles);
            this.assert.strictEqual(await serverStartupReport.warnInsecureDefaults(), false);
            this.assert.strictEqual(loadedRoles.length, 0);
        });
    }

    async testTheAdministratorsOfTheAdminRoleAreChecked()
    {
        await this.test('the administrators of the configured admin role are loaded for the check', async () => {
            let loadedRoles = [];
            let serverStartupReport = this.createServerStartupReport(99, loadedRoles);
            this.assert.strictEqual(await serverStartupReport.warnInsecureDefaults(), true);
            this.assert.deepStrictEqual(loadedRoles, ['role_id:99']);
        });
    }

}

module.exports.TestServerStartupReport = TestServerStartupReport;
