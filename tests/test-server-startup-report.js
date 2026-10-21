/**
 *
 * Reldens - Test Server Startup Report
 *
 */

const { BaseTest } = require('./base-test');
const { LoggerOutputCapture } = require('./fixtures/logger-output-capture');
const { ServerStartupReport } = require('../lib/game/server/server-startup-report');
const { GameServer } = require('../lib/game/server/game-server');
const { ConfigManager } = require('../lib/config/server/manager');
const { Encryptor } = require('@reldens/server-utils');
const { Logger } = require('@reldens/utils');

class TestServerStartupReport extends BaseTest
{

    createServerStartupReport(adminRoleId, loadedRoles, adminUsers = [], monitorConfig = {enabled: false, auth: false})
    {
        return new ServerStartupReport({
            configManager: new ConfigManager({
                environmentConfig: {monitor: monitorConfig, admin: {roleId: adminRoleId}}
            }),
            usersRepository: {
                loadBy: async (field, value) => {
                    loadedRoles.push(field+':'+value);
                    return adminUsers;
                }
            },
            isMonitorSecured: (config) => Object.create(GameServer.prototype).hasAuthentication(config)
        });
    }

    async captureStartupWarnings(serverStartupReport)
    {
        return await LoggerOutputCapture.capture(
            Logger.logLevels.warning,
            async () => serverStartupReport.warnInsecureDefaults()
        );
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

    async testOnlyTheAdministratorsWithTheSamplePasswordAreWarned()
    {
        await this.test('only the administrators that keep the sample password are warned', async () => {
            let adminUsers = [
                {username: 'sample-password-admin', password: Encryptor.encryptPassword('root')},
                {username: 'changed-password-admin', password: Encryptor.encryptPassword('changed-password')}
            ];
            let loggedText = await this.captureStartupWarnings(this.createServerStartupReport(99, [], adminUsers));
            this.assert.strictEqual(-1 !== loggedText.indexOf('sample-password-admin'), true);
            this.assert.strictEqual(-1 === loggedText.indexOf('changed-password-admin'), true);
        });
    }

    async testTheMonitorWithoutCredentialsIsWarned()
    {
        await this.test('the monitor with the authentication enabled and empty credentials is warned as open', async () => {
            let monitorWarning = 'The Colyseus monitor is enabled WITHOUT authentication';
            let emptyCredentialsText = await this.captureStartupWarnings(
                this.createServerStartupReport(0, [], [], {enabled: true, auth: true, user: '', pass: ''})
            );
            let securedText = await this.captureStartupWarnings(
                this.createServerStartupReport(0, [], [], {enabled: true, auth: true, user: 'monitor', pass: 'secret'})
            );
            this.assert.strictEqual(-1 !== emptyCredentialsText.indexOf(monitorWarning), true);
            this.assert.strictEqual(-1 === securedText.indexOf(monitorWarning), true);
        });
    }

}

module.exports.TestServerStartupReport = TestServerStartupReport;
