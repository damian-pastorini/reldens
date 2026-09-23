/**
 *
 * Reldens - TestAdminAuth
 *
 */

const { BaseTest } = require('./base-test');
const { GameConst } = require('../lib/game/constants');

class TestAdminAuth extends BaseTest
{

    async testLoginPageLoads()
    {
        await this.test('Login page loads', async () => {
            let response = await this.makeRequest('GET', this.adminPath+'/login');
            this.assert.strictEqual(200, response.statusCode);
            this.assert(response.body.includes('login') || 
                response.body.includes('email') || 
                response.body.includes('password'));
        });
    }

    async testValidLoginRedirectsToAdmin()
    {
        await this.test('Valid login redirects to admin', async () => {
            let loginPageCookies = await this.fetchLoginPageCookies();
            let response = await this.makeFormRequest('POST',
                this.adminPath+'/login', {
                email: this.adminUser,
                password: this.adminPassword
            }, loginPageCookies);
            this.assert.strictEqual(302, response.statusCode);
            this.assert(response.headers.location.includes(this.adminPath));
        });
    }

    async testInvalidLoginShowsError()
    {
        await this.test('Invalid login shows error', async () => {
            let loginPageCookies = await this.fetchLoginPageCookies();
            let response = await this.makeFormRequest('POST',
                this.adminPath+'/login', {
                email: 'invalid@test.com',
                password: 'wrongpassword'
            }, loginPageCookies);
            this.assert.strictEqual(302, response.statusCode);
            this.assert(response.headers.location.includes('login'));
        });
    }

    async testLoginWithoutRequestTokenIsRejected()
    {
        await this.test('Login without the request token is rejected', async () => {
            let response = await this.makeFormRequest('POST', this.adminPath+'/login', {
                email: this.adminUser,
                password: this.adminPassword
            });
            this.assert.strictEqual(403, response.statusCode);
        });
    }

    async testEntitySaveWithAnotherSessionTokenIsRejected()
    {
        await this.test('Entity save with the request token of another session is rejected', async () => {
            let session = await this.getAuthenticatedSession();
            let anotherSessionToken = this.fetchCsrfToken(await this.fetchLoginPageCookies());
            let sessionCookies = session.filter((cookie) => 0 !== cookie.indexOf(GameConst.ADMIN_CSRF_TOKEN_COOKIE));
            let response = await this.makeFormRequest('POST', this.adminPath+'/config/save', {
                _csrf: anotherSessionToken
            }, sessionCookies);
            this.assert.strictEqual(403, response.statusCode);
        });
    }

    async testLogoutDestroysSession()
    {
        await this.test('Logout destroys session', async () => {
            let response = await this.makeRequest('GET', this.adminPath+'/logout');
            this.assert.strictEqual(302, response.statusCode);
            this.assert(response.headers.location.includes('/login'));
        });
    }

    async testAdminRootRedirectsWhenNotAuthenticated()
    {
        await this.test('Admin root redirects when not authenticated', async () => {
            let response = await this.makeRequest('GET', this.adminPath);
            this.assert.strictEqual(302, response.statusCode);
            this.assert(response.headers.location.includes('/login'));
        });
    }

    async testEntityRoutesRequireAuthentication()
    {
        await this.test('Entity routes require authentication', async () => {
            let response = await this.makeRequest('GET', this.adminPath+'/users');
            this.assert.strictEqual(302, response.statusCode);
            this.assert(response.headers.location.includes('/login'));
        });
    }

}

module.exports.TestAdminAuth = TestAdminAuth;
