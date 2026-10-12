/**
 *
 * Reldens - Test Server Url Matcher
 *
 */

const { BaseTest } = require('./base-test');
const { ServerUrlMatcher } = require('../lib/game/server-url-matcher');

class TestServerUrlMatcher extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.clientUrl = 'ws://localhost:8080';
    }

    async testAnEmptyServerUrlIsTheCurrentServer()
    {
        await this.test('an empty rooms server url is the current server', async () => {
            this.assert.strictEqual(ServerUrlMatcher.isCurrentServer('', this.clientUrl), true);
        });
    }

    async testTheCurrentServerIsMatchedWithAnyScheme()
    {
        await this.test('the rooms server http url matches the client game server ws url', async () => {
            this.assert.strictEqual(ServerUrlMatcher.isCurrentServer('http://localhost:8080', this.clientUrl), true);
            this.assert.strictEqual(ServerUrlMatcher.isCurrentServer('https://example.com', 'wss://example.com'), true);
        });
    }

    async testTheRootTrailingSlashIsTheCurrentServer()
    {
        await this.test('a server url with the root trailing slash matches the same url without it', async () => {
            this.assert.strictEqual(ServerUrlMatcher.isCurrentServer('http://localhost:8080/', this.clientUrl), true);
        });
    }

    async testAnotherPortIsAnotherServer()
    {
        await this.test('a server url with another port is another server', async () => {
            this.assert.strictEqual(ServerUrlMatcher.isCurrentServer('http://localhost:8081', this.clientUrl), false);
        });
    }

    async testTheDefaultPortsOfEachSchemeAreDifferentServers()
    {
        await this.test('the same host on the default ports 80 and 443 are different servers', async () => {
            this.assert.strictEqual(ServerUrlMatcher.isCurrentServer('https://example.com', 'ws://example.com'), false);
            this.assert.strictEqual(ServerUrlMatcher.isCurrentServer('http://example.com', 'wss://example.com'), false);
        });
    }

    async testAnotherPathIsAnotherServer()
    {
        await this.test('a server url with another path on the same host is another server', async () => {
            this.assert.strictEqual(
                ServerUrlMatcher.isCurrentServer('https://example.com/second-server', 'wss://example.com'),
                false
            );
        });
    }

}

module.exports.TestServerUrlMatcher = TestServerUrlMatcher;
