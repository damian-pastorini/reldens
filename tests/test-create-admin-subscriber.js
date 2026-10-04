/**
 *
 * Reldens - Test Create Admin Subscriber
 *
 */

const { BaseTest } = require('./base-test');
const { CreateAdminSubscriber } = require('../lib/admin/server/subscribers/create-admin-subscriber');
const { GameConst } = require('../lib/game/constants');

class TestCreateAdminSubscriber extends BaseTest
{

    runCsrfTokenCookie(csrfEnabled, request)
    {
        let cookieResult = {applied: false, registeredMiddlewares: 0, setCookies: [], nextCalls: 0};
        let registeredMiddlewares = [];
        let adminManager = {
            rootPath: '/reldens-admin',
            router: {adminRouter: {use: (middleware) => registeredMiddlewares.push(middleware)}}
        };
        cookieResult.applied = new CreateAdminSubscriber().applyCsrfTokenCookie(adminManager, csrfEnabled);
        cookieResult.registeredMiddlewares = registeredMiddlewares.length;
        let response = {cookie: (name, value, options) => cookieResult.setCookies.push({name, value, options})};
        for(let middleware of registeredMiddlewares){
            middleware(request, response, () => cookieResult.nextCalls++);
        }
        return cookieResult;
    }

    async testTheCsrfTokenCookieCarriesTheSessionToken()
    {
        await this.test('the admin responses set the session CSRF token in the client readable cookie', async () => {
            let cookieResult = this.runCsrfTokenCookie(true, {session: {csrfToken: 'session-token-a'}, secure: true});
            this.assert.strictEqual(cookieResult.applied, true);
            this.assert.strictEqual(cookieResult.registeredMiddlewares, 1);
            this.assert.deepStrictEqual(cookieResult.setCookies, [{
                name: GameConst.ADMIN_CSRF_TOKEN_COOKIE,
                value: 'session-token-a',
                options: {path: '/reldens-admin', sameSite: 'strict', secure: true}
            }]);
            this.assert.strictEqual(cookieResult.nextCalls, 1);
        });
    }

    async testTheCsrfTokenCookieIsNotSetWithoutSessionToken()
    {
        await this.test('the CSRF token cookie is not set when the session has no token', async () => {
            let cookieResult = this.runCsrfTokenCookie(true, {session: {}, secure: false});
            this.assert.strictEqual(cookieResult.setCookies.length, 0);
            this.assert.strictEqual(cookieResult.nextCalls, 1);
        });
    }

    async testTheCsrfTokenCookieIsNotRegisteredWhenDisabled()
    {
        await this.test('the CSRF token cookie middleware is not registered with the protection disabled', async () => {
            let cookieResult = this.runCsrfTokenCookie(false, {session: {csrfToken: 'session-token-a'}, secure: false});
            this.assert.strictEqual(cookieResult.applied, false);
            this.assert.strictEqual(cookieResult.registeredMiddlewares, 0);
            this.assert.strictEqual(cookieResult.setCookies.length, 0);
        });
    }

    async testTheSessionUserKeepsOnlyTheSessionFields()
    {
        await this.test('the admin session user keeps the user fields without the password and relations', async () => {
            let expectedSessionUser = {
                id: 1,
                email: 'root@test.com',
                username: 'root',
                role_id: 99,
                status: '1',
                sessionRevision: 'revision-a'
            };
            let sessionUser = new CreateAdminSubscriber().mapSessionUser({
                ...expectedSessionUser,
                password: 'stored-hash',
                related_users_login: [{id: 1, user_id: 1}],
                related_players: [{id: 1, name: 'player'}]
            });
            this.assert.deepStrictEqual(sessionUser, expectedSessionUser);
        });
    }

    async testTheSessionUserIsFalseWhenTheLoginFails()
    {
        await this.test('the admin session user is false when the authentication fails', async () => {
            this.assert.strictEqual(new CreateAdminSubscriber().mapSessionUser(false), false);
        });
    }

}

module.exports.TestCreateAdminSubscriber = TestCreateAdminSubscriber;
