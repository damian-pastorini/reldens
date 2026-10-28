/**
 *
 * Reldens - Test Global Rate Limit
 *
 */

const { BaseTest } = require('./base-test');
const { EnvironmentVariablesReader } = require('../lib/game/server/environment-variables-reader');
const { AppServerFactory } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');
const { once } = require('events');

class TestGlobalRateLimit extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.maxRequests = 2;
    }

    readGlobalRateLimit(environmentValue)
    {
        let hasPreviousValue = sc.hasOwn(process.env, 'RELDENS_GLOBAL_RATE_LIMIT');
        let previousValue = process.env.RELDENS_GLOBAL_RATE_LIMIT;
        process.env.RELDENS_GLOBAL_RATE_LIMIT = environmentValue;
        let environmentConfig = EnvironmentVariablesReader.fetchConfigServerFromEnvironmentVariables();
        delete process.env.RELDENS_GLOBAL_RATE_LIMIT;
        if(hasPreviousValue){
            process.env.RELDENS_GLOBAL_RATE_LIMIT = previousValue;
        }
        return environmentConfig.appServerConfig.globalRateLimit;
    }

    async testTheGlobalRateLimitSwitchIsReadFromTheEnvironment()
    {
        await this.test('the global rate limit switch is read into the app server configuration', async () => {
            this.assert.strictEqual(this.readGlobalRateLimit('1'), true);
            this.assert.strictEqual(this.readGlobalRateLimit('0'), false);
        });
    }

    async testTheEnabledGlobalLimiterRejectsTheRequestsAboveTheMaximum()
    {
        await this.test('the enabled global limiter answers too many requests above the maximum', async () => {
            let createdAppServer = new AppServerFactory().createAppServer({
                globalRateLimit: true,
                maxRequests: this.maxRequests,
                developmentMultiplier: 1
            });
            createdAppServer.app.get('/limited', (request, response) => response.send('ok'));
            createdAppServer.appServer.listen(0, '127.0.0.1');
            await once(createdAppServer.appServer, 'listening');
            let limitedUrl = 'http://127.0.0.1:'+createdAppServer.appServer.address().port+'/limited';
            let statusCodes = [];
            for(let i = 0; i <= this.maxRequests; i++){
                let response = await fetch(limitedUrl);
                await response.text();
                statusCodes.push(response.status);
            }
            createdAppServer.appServer.closeAllConnections();
            createdAppServer.appServer.close();
            await once(createdAppServer.appServer, 'close');
            this.assert.deepStrictEqual(statusCodes, [200, 200, 429]);
        });
    }

}

module.exports.TestGlobalRateLimit = TestGlobalRateLimit;
