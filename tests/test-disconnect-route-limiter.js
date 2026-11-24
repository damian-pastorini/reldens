/**
 *
 * Reldens - Test Disconnect Route Limiter
 *
 */

const { BaseTest } = require('./base-test');
const { UserDisconnectionBuilder } = require('./fixtures/user-disconnection-builder');
const { ServerManager } = require('../lib/game/server/manager');
const { GameConst } = require('../lib/game/constants');
const { sc } = require('@reldens/utils');

class TestDisconnectRouteLimiter extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.victimUserModel = {username: 'victim'};
    }

    async testOnlyAnUnusedSignedRequestIsSignedForTheRouteLimiter()
    {
        await this.test('only a disconnect request with a valid token not used yet is a signed request for the route limiter', async () => {
            let userDisconnection = UserDisconnectionBuilder.create(
                UserDisconnectionBuilder.createLoginManager({}),
                this.victimUserModel,
                []
            );
            let token = UserDisconnectionBuilder.createToken(userDisconnection, 'victim');
            let requests = [
                {body: {username: 'victim', token}},
                {},
                {body: {username: 'victim'}},
                {body: {username: 'attacker', token}},
                {body: {username: 'victim', token, isServerChange: true}}
            ];
            let results = [];
            for(let request of requests){
                results.push(userDisconnection.isUnusedSignedRequest(request));
            }
            await userDisconnection.disconnectUserByLoginData(requests[0]);
            results.push(userDisconnection.isUnusedSignedRequest(requests[0]));
            this.assert.deepStrictEqual(results, [true, false, false, false, false, false]);
        });
    }

    async testTheDisconnectRouteLimiterSkipsOnlyTheSignedRequests()
    {
        await this.test('the disconnect route skips the address limiter for a signed request and limits every other one', async () => {
            let listeners = {};
            let loginManager = UserDisconnectionBuilder.createLoginManager(listeners);
            let userDisconnection = UserDisconnectionBuilder.create(loginManager, this.victimUserModel, []);
            let postedRoutes = {};
            let limitedRequests = [];
            let appServerFactory = {rateLimitConfigurer: {
                createHomeLimiter: () => (req) => limitedRequests.push(sc.get(req.body, 'username', 'no-body'))
            }};
            let app = {post: (path, ...handlers) => postedRoutes[path] = handlers, get: () => true, use: () => true};
            await listeners['reldens.serverBeforeListen']({serverManager: {app, appServerFactory}});
            let [routeLimiter, routeHandler] = postedRoutes[GameConst.ROUTE_PATHS.DISCONNECT_USER];
            let token = UserDisconnectionBuilder.createToken(userDisconnection, 'victim');
            let passedRequests = [];
            for(let request of [{body: {username: 'victim', token}}, {body: {username: 'visitor'}}, {}]){
                routeLimiter(request, {}, () => passedRequests.push(request.body.username));
            }
            let homeLimitedRoutes = [];
            let serverManager = Object.create(ServerManager.prototype);
            serverManager.app = {use: (path) => homeLimitedRoutes.push(path)};
            serverManager.appServerFactory = appServerFactory;
            serverManager.enableRoutesRateLimit();
            this.assert.deepStrictEqual(
                [
                    passedRequests,
                    limitedRequests,
                    'function' === typeof routeHandler,
                    homeLimitedRoutes.includes(GameConst.ROUTE_PATHS.DISCONNECT_USER)
                ],
                [['victim'], ['visitor', 'no-body'], true, false]
            );
        });
    }

}

module.exports.TestDisconnectRouteLimiter = TestDisconnectRouteLimiter;
