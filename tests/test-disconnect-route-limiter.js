/**
 *
 * Reldens - Test Disconnect Route Limiter
 *
 * Tests the signed routes of the login manager: only a disconnect message with a valid token not used yet skips the
 * address limiter, and the disconnect and both names check routes limit only the requests that are not signed, never
 * through the home limited routes.
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
        this.signedRoutes = [
            GameConst.ROUTE_PATHS.DISCONNECT_USER,
            GameConst.ROUTE_PATHS.CHECK_USER_NAME,
            GameConst.ROUTE_PATHS.CHECK_PLAYER_NAME
        ];
    }

    async testOnlyAnUnusedSignedRequestIsSignedForTheRouteLimiter()
    {
        await this.test('only a disconnect message with a valid token not used yet is a signed request for the route limiter', async () => {
            let userDisconnection = UserDisconnectionBuilder.create(
                UserDisconnectionBuilder.createLoginManager({}),
                this.victimUserModel,
                []
            );
            let body = UserDisconnectionBuilder.createRequestBody(userDisconnection, 'victim');
            let requests = [
                {body},
                {},
                {body: {targetId: 'victim', action: GameConst.DISCONNECTION.DISCONNECT}},
                {body: Object.assign({}, body, {targetId: 'attacker'})},
                {body: Object.assign({}, body, {action: GameConst.DISCONNECTION.SERVER_CHANGE})}
            ];
            let results = [];
            for(let request of requests){
                results.push(userDisconnection.isUnusedSignedRequest(request));
            }
            await userDisconnection.receiveRequest(requests[0]);
            results.push(userDisconnection.isUnusedSignedRequest(requests[0]));
            this.assert.deepStrictEqual(results, [true, false, false, false, false, false]);
        });
    }

    async testTheSignedRoutesLimiterSkipsOnlyTheSignedRequests()
    {
        await this.test('the disconnect route skips the address limiter for a signed request, and every signed route limits only the unsigned ones', async () => {
            let listeners = {};
            let loginManager = UserDisconnectionBuilder.createLoginManager(listeners);
            let userDisconnection = UserDisconnectionBuilder.create(loginManager, this.victimUserModel, []);
            let postedRoutes = {};
            let limitedRequests = [];
            let appServerFactory = {rateLimitConfigurer: {
                createHomeLimiter: () => (req) => limitedRequests.push(sc.get(req.body, 'targetId', 'no-body'))
            }};
            let app = {post: (path, ...handlers) => postedRoutes[path] = handlers, get: () => true, use: () => true};
            await listeners['reldens.serverBeforeListen']({serverManager: {app, appServerFactory}});
            let [routeLimiter, routeHandler] = postedRoutes[GameConst.ROUTE_PATHS.DISCONNECT_USER];
            let body = UserDisconnectionBuilder.createRequestBody(userDisconnection, 'victim');
            let passedRequests = [];
            for(let request of [{body}, {body: {targetId: 'visitor'}}, {}]){
                routeLimiter(request, {}, () => passedRequests.push(request.body.targetId));
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
                    this.signedRoutes.map(routePath => sc.get(postedRoutes, routePath, []).length),
                    this.signedRoutes.filter(routePath => homeLimitedRoutes.includes(routePath))
                ],
                [['victim'], ['visitor', 'no-body'], true, [2, 2, 2], []]
            );
        });
    }

}

module.exports.TestDisconnectRouteLimiter = TestDisconnectRouteLimiter;
