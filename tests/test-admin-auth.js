/**
 *
 * Reldens - TestAdminAuth
 *
 */

const { BaseTest } = require('./base-test');

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
            let response = await this.makeFormRequest('POST', 
                this.adminPath+'/login', {
                email: this.adminUser,
                password: this.adminPassword
            });
            this.assert.strictEqual(302, response.statusCode);
            this.assert(response.headers.location.includes(this.adminPath));
        });
    }

    async testInvalidLoginShowsError()
    {
        await this.test('Invalid login shows error', async () => {
            let response = await this.makeFormRequest('POST', 
                this.adminPath+'/login', {
                email: 'invalid@test.com',
                password: 'wrongpassword'
            });
            this.assert.strictEqual(302, response.statusCode);
            this.assert(response.headers.location.includes('login'));
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
