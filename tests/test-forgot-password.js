/**
 *
 * Reldens - Test Forgot Password
 *
 */

const { BaseTest } = require('./base-test');
const { ForgotPassword } = require('../lib/game/server/forgot-password');
const { LoginManager } = require('../lib/game/server/login-manager');
const { LoginAttempts } = require('../lib/game/server/memory/login-attempts');
const { ExpiringHmacToken } = require('../lib/game/server/expiring-hmac-token');
const { GameConst } = require('../lib/game/constants');
const { Encryptor } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');

class TestForgotPassword extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.secret = 'test-secret';
        this.userEmail = 'user@reldens.com';
        this.userPassword = 'current-password';
    }

    async createResetSetup()
    {
        let resetSetup = {
            storedUser: {email: this.userEmail, username: 'user', password: Encryptor.encryptPassword(this.userPassword)},
            updates: [],
            routes: {},
            renderedTemplates: [],
            expiringHmacToken: new ExpiringHmacToken({secret: this.secret})
        };
        resetSetup.serverManager = {
            app: {
                get: (path, handler) => resetSetup.routes['GET'+path] = handler,
                post: (path, handler) => resetSetup.routes['POST'+path] = handler
            },
            usersManager: {
                loadUserByEmail: async (email) => email === resetSetup.storedUser.email ? resetSetup.storedUser : false,
                updateUserByEmail: async (email, userData) => {
                    resetSetup.updates.push(email);
                    return Object.assign(resetSetup.storedUser, userData);
                }
            },
            loginManager: {expiringHmacToken: resetSetup.expiringHmacToken, passwordManager: Encryptor},
            themeManager: {
                projectAssetsPath: 'theme/default/assets',
                assetPath: (folder, fileName) => fileName,
                loadAndRenderTemplate: async (fileName, params) => {
                    resetSetup.renderedTemplates.push({fileName, params});
                    return fileName;
                },
                templateEngine: {render: async (layoutContent, params) => params.content}
            }
        };
        await ForgotPassword.defineRequestOnServerManagerApp(resetSetup.serverManager);
        return resetSetup;
    }

    createForgotPasswordLoginManager(lastSentTime, sentEmails, userUpdates)
    {
        let loginManager = Object.create(LoginManager.prototype);
        loginManager.mailerForgotPasswordLimit = 4;
        loginManager.registrationMaxPerIp = 10;
        loginManager.loginAttempts = new LoginAttempts({});
        loginManager.events = {emitSync: () => true};
        loginManager.mailer = {isEnabled: () => true};
        loginManager.usersManager = {
            loadUserByEmail: async (email) => ({
                id: 1,
                email,
                password: 'stored-password-hash',
                password_reset_sent_at: sc.formatDate(new Date(lastSentTime))
            }),
            updateUserByEmail: async (email, updatePatch) => userUpdates.push({email, updatePatch})
        };
        loginManager.sendForgotPasswordEmail = async (userData) => sentEmails.push(userData.email);
        return loginManager;
    }

    async sendRequest(resetSetup, method, requestData)
    {
        let sentContents = [];
        let request = 'GET' === method ? {query: requestData} : {body: requestData};
        await resetSetup.routes[method+GameConst.ROUTE_PATHS.RESET_PASSWORD](request, {
            send: (content) => sentContents.push(content)
        });
        return [...sentContents].shift();
    }

    async testTheResetLinkOpensTheFormWithoutChangingThePassword()
    {
        await this.test('the reset link sent by email opens the reset form and does not change the password', async () => {
            let resetSetup = await this.createResetSetup();
            let emailTemplates = [];
            let loginManager = new LoginManager({
                config: {
                    get: (path, defaultValue) => defaultValue,
                    getWithoutLogs: (path, defaultValue) => defaultValue,
                    server: {publicUrl: 'http://localhost:8080'}
                },
                configServer: {publicUrl: 'http://localhost:8080'},
                events: {on: () => true},
                themeManager: {
                    assetPath: (folder, fileName) => fileName,
                    loadAndRenderTemplate: async (fileName, params) => emailTemplates.push(params)
                },
                mailer: {sendEmail: async () => true}
            });
            loginManager.expiringHmacToken = resetSetup.expiringHmacToken;
            let passwordBeforeReset = resetSetup.storedUser.password;
            let sendResult = await loginManager.sendForgotPasswordEmail(
                {email: this.userEmail},
                resetSetup.storedUser.password
            );
            this.assert.strictEqual(sendResult, true);
            let resetLink = new URL([...emailTemplates].shift().resetLink);
            let sentContent = await this.sendRequest(resetSetup, 'GET', {
                email: resetLink.searchParams.get('email'),
                token: resetLink.searchParams.get('token')
            });
            this.assert.strictEqual(resetLink.pathname, GameConst.ROUTE_PATHS.RESET_PASSWORD);
            this.assert.strictEqual(sentContent, 'reset-form.html');
            this.assert.strictEqual(resetSetup.updates.length, 0);
            this.assert.strictEqual(resetSetup.storedUser.password, passwordBeforeReset);
        });
    }

    async testTheResetFormIsNotShownWithAnInvalidToken()
    {
        await this.test('the reset form is not shown when the link token is invalid', async () => {
            let resetSetup = await this.createResetSetup();
            let sentContent = await this.sendRequest(resetSetup, 'GET', {email: this.userEmail, token: 'invalid'});
            this.assert.strictEqual(sentContent, 'reset-error.html');
            this.assert.strictEqual(resetSetup.updates.length, 0);
        });
    }

    async testThePasswordIsResetWithAValidToken()
    {
        await this.test('the password is reset and the new password is valid when the form is posted with a valid token', async () => {
            let resetSetup = await this.createResetSetup();
            let expiresAt = Date.now()+GameConst.SIGNED_TOKENS.RESET_PASSWORD_EXPIRATION;
            let token = resetSetup.expiringHmacToken.generate([this.userEmail, resetSetup.storedUser.password], expiresAt);
            let sentContent = await this.sendRequest(resetSetup, 'POST', {email: this.userEmail, token});
            let successTemplate = [...resetSetup.renderedTemplates].pop();
            this.assert.strictEqual(sentContent, 'reset-success.html');
            this.assert.deepStrictEqual(resetSetup.updates, [this.userEmail]);
            this.assert.strictEqual(Encryptor.validatePassword(this.userPassword, resetSetup.storedUser.password), false);
            this.assert.strictEqual(
                Encryptor.validatePassword(successTemplate.params.newPass, resetSetup.storedUser.password),
                true
            );
        });
    }

    async testThePasswordIsNotResetWithAnExpiredToken()
    {
        await this.test('the password is not reset when the form is posted with an expired token', async () => {
            let resetSetup = await this.createResetSetup();
            let passwordBeforeReset = resetSetup.storedUser.password;
            let token = resetSetup.expiringHmacToken.generate([this.userEmail, passwordBeforeReset], Date.now()-1);
            let sentContent = await this.sendRequest(resetSetup, 'POST', {email: this.userEmail, token});
            this.assert.strictEqual(sentContent, 'reset-error.html');
            this.assert.strictEqual(resetSetup.updates.length, 0);
            this.assert.strictEqual(resetSetup.storedUser.password, passwordBeforeReset);
        });
    }

    async testTheSameResetLinkCanNotBeUsedTwice()
    {
        await this.test('the same reset link can not reset the password a second time', async () => {
            let resetSetup = await this.createResetSetup();
            let expiresAt = Date.now()+GameConst.SIGNED_TOKENS.RESET_PASSWORD_EXPIRATION;
            let token = resetSetup.expiringHmacToken.generate([this.userEmail, resetSetup.storedUser.password], expiresAt);
            await this.sendRequest(resetSetup, 'POST', {email: this.userEmail, token});
            let passwordAfterFirstReset = resetSetup.storedUser.password;
            let sentContent = await this.sendRequest(resetSetup, 'POST', {email: this.userEmail, token});
            this.assert.strictEqual(sentContent, 'reset-error.html');
            this.assert.deepStrictEqual(resetSetup.updates, [this.userEmail]);
            this.assert.strictEqual(resetSetup.storedUser.password, passwordAfterFirstReset);
        });
    }

    async testTheResetEmailIsNotSentAgainInsideTheStoredInterval()
    {
        await this.test('the reset email is not sent again inside the stored per user interval', async () => {
            let sentEmails = [];
            let userUpdates = [];
            let loginManager = this.createForgotPasswordLoginManager(Date.now()-60000, sentEmails, userUpdates);
            await loginManager.processForgotPassword({forgot: true, email: this.userEmail}, '10.0.0.1');
            this.assert.strictEqual(sentEmails.length, 0);
            this.assert.strictEqual(userUpdates.length, 0);
        });
    }

    async testTheResetEmailIsSentAndStoredAfterTheInterval()
    {
        await this.test('the reset email is sent and the sent time is stored once the interval passed', async () => {
            let sentEmails = [];
            let userUpdates = [];
            let intervalMs = 4 * 60 * 60 * 1000;
            let loginManager = this.createForgotPasswordLoginManager(Date.now()-intervalMs-1000, sentEmails, userUpdates);
            let requestSecond = Date.now() - Date.now() % 1000;
            await loginManager.processForgotPassword({forgot: true, email: this.userEmail}, '10.0.0.1');
            this.assert.deepStrictEqual(sentEmails, [this.userEmail]);
            this.assert.strictEqual(userUpdates.length, 1);
            let userUpdate = [...userUpdates].shift();
            this.assert.strictEqual(userUpdate.email, this.userEmail);
            this.assert.strictEqual(requestSecond <= new Date(userUpdate.updatePatch.password_reset_sent_at).getTime(), true);
        });
    }

}

module.exports.TestForgotPassword = TestForgotPassword;
