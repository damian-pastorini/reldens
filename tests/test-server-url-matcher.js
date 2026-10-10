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
        this.gameServerUrl = 'ws://localhost:8080';
    }

    async testTheSameServerIsMatchedWithAnyScheme()
    {
        await this.test('the rooms server http url matches the client game server ws url', async () => {
            this.assert.strictEqual(ServerUrlMatcher.isSameServer('http://localhost:8080', this.gameServerUrl), true);
            this.assert.strictEqual(ServerUrlMatcher.isSameServer('https://example.com', 'wss://example.com'), true);
        });
    }

    async testTheRootTrailingSlashIsTheSameServer()
    {
        await this.test('a server url with the root trailing slash matches the same url without it', async () => {
            this.assert.strictEqual(ServerUrlMatcher.isSameServer('http://localhost:8080/', this.gameServerUrl), true);
        });
    }

    async testAnotherPortIsAnotherServer()
    {
        await this.test('a server url with another port is another server', async () => {
            this.assert.strictEqual(ServerUrlMatcher.isSameServer('http://localhost:8081', this.gameServerUrl), false);
        });
    }

    async testAnotherPathIsAnotherServer()
    {
        await this.test('a server url with another path on the same host is another server', async () => {
            this.assert.strictEqual(
                ServerUrlMatcher.isSameServer('https://example.com/second-server', 'wss://example.com'),
                false
            );
        });
    }

}

module.exports.TestServerUrlMatcher = TestServerUrlMatcher;
