/**
 *
 * Reldens - Test Server Config Enricher
 *
 */

const { BaseTest } = require('./base-test');
const { ServerConfigEnricher } = require('../lib/game/server/server-config-enricher');
const { ConfigManager } = require('../lib/config/server/manager');

class TestServerConfigEnricher extends BaseTest
{

    createServerConfigEnricher(environmentConfig, rooms)
    {
        return new ServerConfigEnricher({
            configManager: new ConfigManager({environmentConfig}),
            roomsRepository: {loadAll: async () => rooms}
        });
    }

    async testTheEnvironmentGuestsEmailDomainIsUsedWithoutARow()
    {
        await this.test('the environment guests email domain is used when no configuration row sets it', async () => {
            let serverConfigEnricher = this.createServerConfigEnricher({}, []);
            this.assert.strictEqual(serverConfigEnricher.enrichGuestsEmailDomain('@guest-env.com'), '@guest-env.com');
            let configManager = serverConfigEnricher.configManager;
            this.assert.strictEqual(configManager.get('server/players/guestsUser/emailDomain'), '@guest-env.com');
        });
    }

    async testTheConfiguredGuestsEmailDomainIsKept()
    {
        await this.test('the configured guests email domain is kept over the environment domain', async () => {
            let serverConfigEnricher = this.createServerConfigEnricher(
                {players: {guestsUser: {emailDomain: '@configured.com'}}},
                []
            );
            this.assert.strictEqual(serverConfigEnricher.enrichGuestsEmailDomain('@guest-env.com'), '@configured.com');
        });
    }

    async testEveryRoomGetsItsServerUrlOrTheServerDefaultUrl()
    {
        await this.test('every room gets its own server url, then the public url, then the base url', async () => {
            let rooms = [{name: 'town', server_url: 'http://other:9090'}, {name: 'forest', server_url: null}];
            let publicUrlEnricher = this.createServerConfigEnricher(
                {publicUrl: 'http://public:8080', baseUrl: 'http://base:8080'},
                rooms
            );
            await publicUrlEnricher.enrichRoomsServersUrls();
            this.assert.deepStrictEqual(
                publicUrlEnricher.configManager.get('client/rooms/servers'),
                {town: 'http://other:9090', forest: 'http://public:8080'}
            );
            let baseUrlEnricher = this.createServerConfigEnricher({publicUrl: '', baseUrl: 'http://base:8080'}, rooms);
            await baseUrlEnricher.enrichRoomsServersUrls();
            let baseUrlConfigManager = baseUrlEnricher.configManager;
            this.assert.strictEqual(baseUrlConfigManager.get('client/rooms/servers/forest'), 'http://base:8080');
        });
    }

}

module.exports.TestServerConfigEnricher = TestServerConfigEnricher;
