/**
 *
 * Reldens - Test Config Manager
 *
 */

const { BaseTest } = require('./base-test');
const { ConfigManager } = require('../lib/config/server/manager');
const { ConfigConst } = require('../lib/config/constants');

class TestConfigManager extends BaseTest
{

    createConfigManager(environmentConfig, configRows)
    {
        return new ConfigManager({
            events: {emit: async () => true},
            dataServer: {getEntity: () => ({loadAll: async () => configRows})},
            environmentConfig
        });
    }

    async testTheEnvironmentValuesAreTheInitialServerConfiguration()
    {
        await this.test('the environment values are the initial server configuration', async () => {
            let configManager = this.createConfigManager({port: 8080, rooms: {validateRoomsOriginRequest: true}}, []);
            this.assert.strictEqual(configManager.get('server/port'), 8080);
            this.assert.strictEqual(configManager.get('server/rooms/validateRoomsOriginRequest'), true);
        });
    }

    async testTheRowOverridesOnlyTheEnvironmentValueOnTheSamePath()
    {
        await this.test('a configuration row overrides only the environment value on the same path', async () => {
            let configManager = this.createConfigManager(
                {security: {ipLists: {enabled: false, allow: ['10.0.0.1']}}},
                [{scope: 'server', path: 'security/ipLists/enabled', type: ConfigConst.CONFIG_TYPE_BOOLEAN, value: '1'}]
            );
            await configManager.loadConfigurations();
            this.assert.strictEqual(configManager.get('server/security/ipLists/enabled'), true);
            this.assert.deepStrictEqual(configManager.get('server/security/ipLists/allow'), ['10.0.0.1']);
        });
    }

}

module.exports.TestConfigManager = TestConfigManager;
