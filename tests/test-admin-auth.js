/**
 *
 * Reldens - TestAdminAuth
 *
 */

const { BaseTest } = require('./base-test');
const { Logger } = require('@reldens/utils');

class TestAdminAuth extends BaseTest
{

    async runAllTests()
    {
        Logger.log(100, '', 'Running tests for TestAdminAuth');
        await this.testLoginEndpoint();
        await this.testLogoutEndpoint();
        await this.testProtectedRoutes();
        Logger.log(100, '', 'Tests run: '+this.testCount);
        Logger.log(100, '', 'Passed: '+this.passedCount);
        Logger.log(100, '', 'Failed: '+(this.testCount - this.passedCount));
    }

    async testLoginEndpoint()
    {
        await this.test('Login page loads', async () => {
            let response = await this.makeRequest('GET', this.adminPath+'/login');
            this.assert.strictEqual(200, response.statusCode);
            this.assert(response.body.includes('login') || 
                response.body.includes('email') || 
                response.body.includes('password'));
        });

        await this.test('Valid login redirects to admin', async () => {
            let response = await this.makeFormRequest('POST', 
                this.adminPath+'/login', {
                email: this.adminUser,
                password: this.adminPassword
            });
            this.assert.strictEqual(302, response.statusCode);
            this.assert(response.headers.location.includes(this.adminPath));
        });

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

    async testLogoutEndpoint()
    {
        await this.test('Logout destroys session', async () => {
            let response = await this.makeRequest('GET', this.adminPath+'/logout');
            this.assert.strictEqual(302, response.statusCode);
            this.assert(response.headers.location.includes('/login'));
        });
    }

    async testProtectedRoutes()
    {
        await this.test('Admin root redirects when not authenticated', async () => {
            let response = await this.makeRequest('GET', this.adminPath);
            this.assert.strictEqual(302, response.statusCode);
            this.assert(response.headers.location.includes('/login'));
        });

        await this.test('Entity routes require authentication', async () => {
            let response = await this.makeRequest('GET', this.adminPath+'/users');
            this.assert.strictEqual(302, response.statusCode);
            this.assert(response.headers.location.includes('/login'));
        });
    }

}

module.exports.TestAdminAuth = TestAdminAuth;
