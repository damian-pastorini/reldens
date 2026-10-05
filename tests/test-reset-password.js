/**
 *
 * Reldens - Test Reset Password
 *
 */

const { BaseTest } = require('./base-test');
const { ForgotPassword } = require('../lib/game/server/forgot-password');
const { ExpiringHmacToken } = require('../lib/game/server/expiring-hmac-token');
const { GameConst } = require('../lib/game/constants');
const { Encryptor } = require('@reldens/server-utils');

class TestResetPassword extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.secret = 'test-secret';
        this.userEmail = 'user@reldens.com';
        this.userPassword = 'current-password';
        this.newPassword = 'new-valid-password';
    }

    createResetSetup()
    {
        let resetSetup = {
            storedUser: {
                id: 1,
                email: this.userEmail,
                username: 'user',
                password: Encryptor.encryptPassword(this.userPassword)
            },
            updates: [],
            routes: {},
            renderedTemplates: [],
            expiringHmacToken: new ExpiringHmacToken({secret: this.secret})
        };
        resetSetup.forgotPassword = new ForgotPassword({
            config: {getWithoutLogs: (path, defaultValue) => defaultValue},
            usersManager: {
                loadUserByEmail: async (email) => {
                    return email === resetSetup.storedUser.email ? Object.assign({}, resetSetup.storedUser) : false;
                },
                replacePasswordIfUnchanged: async (userId, currentPasswordHash, newPasswordHash) => {
                    return this.replaceStoredPassword(resetSetup, userId, currentPasswordHash, newPasswordHash);
                }
            },
            themeManager: {
                projectAssetsPath: 'theme/default/assets',
                assetPath: (folder, fileName) => fileName,
                loadAndRenderTemplate: async (fileName, params) => {
                    resetSetup.renderedTemplates.push({fileName, params});
                    return fileName;
                },
                templateEngine: {render: async (layoutContent, params) => params.content}
            },
            expiringHmacToken: resetSetup.expiringHmacToken,
            passwordManager: Encryptor
        });
        resetSetup.forgotPassword.defineResetPasswordRoutes({
            get: (path, handler) => resetSetup.routes['GET'+path] = handler,
            post: (path, handler) => resetSetup.routes['POST'+path] = handler
        });
        return resetSetup;
    }

    replaceStoredPassword(resetSetup, userId, currentPasswordHash, newPasswordHash)
    {
        if(resetSetup.storedUser.id !== userId){
            return false;
        }
        if(resetSetup.storedUser.password !== currentPasswordHash){
            return false;
        }
        resetSetup.updates.push(userId);
        resetSetup.storedUser.password = newPasswordHash;
        return true;
    }

    async sendRequest(resetSetup, method, requestData)
    {
        let sentContents = [];
        let request = 'GET' === method ? {query: requestData} : {body: requestData};
        let response = {statusCode: 200, send: (content) => sentContents.push(content)};
        response.status = (statusCode) => {
            response.statusCode = statusCode;
            sentContents.push(statusCode);
            return response;
        };
        await resetSetup.routes[method+GameConst.ROUTE_PATHS.RESET_PASSWORD](request, response);
        return sentContents.join('|');
    }

    createValidToken(resetSetup)
    {
        return resetSetup.expiringHmacToken.generate(
            [this.userEmail, resetSetup.storedUser.password],
            Date.now()+GameConst.SIGNED_TOKENS.RESET_PASSWORD_EXPIRATION
        );
    }

    async postReset(resetSetup, token, password, rePassword)
    {
        return await this.sendRequest(
            resetSetup,
            'POST',
            {email: this.userEmail, token, password, 're-password': rePassword}
        );
    }

    async testTheResetLinkOpensTheFormWithoutChangingThePassword()
    {
        await this.test('the reset link sent by email opens the form and does not change the password', async () => {
            let resetSetup = this.createResetSetup();
            let emailTemplates = [];
            let forgotPassword = new ForgotPassword({
                config: {
                    getWithoutLogs: (path, defaultValue) => defaultValue,
                    server: {publicUrl: 'http://localhost:8080'}
                },
                themeManager: {
                    assetPath: (folder, fileName) => fileName,
                    loadAndRenderTemplate: async (fileName, params) => emailTemplates.push(params)
                },
                mailer: {sendEmail: async () => true},
                expiringHmacToken: resetSetup.expiringHmacToken
            });
            let passwordBeforeReset = resetSetup.storedUser.password;
            let sendResult = await forgotPassword.sendForgotPasswordEmail(
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
            let resetSetup = this.createResetSetup();
            let sentContent = await this.sendRequest(resetSetup, 'GET', {email: this.userEmail, token: 'invalid'});
            this.assert.strictEqual(sentContent, 'reset-error.html');
            this.assert.strictEqual(resetSetup.updates.length, 0);
        });
    }

    async testThePasswordIsResetWithTheSubmittedPassword()
    {
        await this.test('the password is replaced by the submitted one when posted with a valid token', async () => {
            let resetSetup = this.createResetSetup();
            let token = this.createValidToken(resetSetup);
            let sentContent = await this.postReset(resetSetup, token, this.newPassword, this.newPassword);
            let successTemplate = [...resetSetup.renderedTemplates].pop();
            this.assert.strictEqual(sentContent, 'reset-success.html');
            this.assert.deepStrictEqual(successTemplate.params, {userName: 'user'});
            this.assert.deepStrictEqual(resetSetup.updates, [1]);
            this.assert.strictEqual(
                await Encryptor.validatePassword(this.userPassword, resetSetup.storedUser.password),
                false
            );
            this.assert.strictEqual(
                await Encryptor.validatePassword(this.newPassword, resetSetup.storedUser.password),
                true
            );
        });
    }

    async testThePasswordIsNotResetWithMismatchedPasswords()
    {
        await this.test('the password is not reset when the submitted passwords do not match', async () => {
            let resetSetup = this.createResetSetup();
            let passwordBeforeReset = resetSetup.storedUser.password;
            let token = this.createValidToken(resetSetup);
            let sentContent = await this.postReset(resetSetup, token, this.newPassword, 'another-password');
            this.assert.strictEqual(sentContent, 'reset-error.html');
            this.assert.strictEqual(resetSetup.updates.length, 0);
            this.assert.strictEqual(resetSetup.storedUser.password, passwordBeforeReset);
        });
    }

    async testThePasswordIsNotResetWithAShortPassword()
    {
        await this.test('the password is not reset when the submitted one is shorter than the policy', async () => {
            let resetSetup = this.createResetSetup();
            let passwordBeforeReset = resetSetup.storedUser.password;
            let sentContent = await this.postReset(resetSetup, this.createValidToken(resetSetup), 'ab', 'ab');
            this.assert.strictEqual(sentContent, 'reset-error.html');
            this.assert.strictEqual(resetSetup.updates.length, 0);
            this.assert.strictEqual(resetSetup.storedUser.password, passwordBeforeReset);
        });
    }

    async testThePasswordIsNotResetWithAnExpiredToken()
    {
        await this.test('the password is not reset when the form is posted with an expired token', async () => {
            let resetSetup = this.createResetSetup();
            let passwordBeforeReset = resetSetup.storedUser.password;
            let token = resetSetup.expiringHmacToken.generate([this.userEmail, passwordBeforeReset], Date.now()-1);
            let sentContent = await this.postReset(resetSetup, token, this.newPassword, this.newPassword);
            this.assert.strictEqual(sentContent, 'reset-error.html');
            this.assert.strictEqual(resetSetup.updates.length, 0);
            this.assert.strictEqual(resetSetup.storedUser.password, passwordBeforeReset);
        });
    }

    async testTheSameResetLinkCanNotBeUsedTwice()
    {
        await this.test('the same reset link can not reset the password a second time', async () => {
            let resetSetup = this.createResetSetup();
            let token = this.createValidToken(resetSetup);
            await this.postReset(resetSetup, token, this.newPassword, this.newPassword);
            let passwordAfterFirstReset = resetSetup.storedUser.password;
            let sentContent = await this.postReset(resetSetup, token, this.newPassword, this.newPassword);
            this.assert.strictEqual(sentContent, 'reset-error.html');
            this.assert.deepStrictEqual(resetSetup.updates, [1]);
            this.assert.strictEqual(resetSetup.storedUser.password, passwordAfterFirstReset);
        });
    }

    async testConcurrentPostsOfOneResetLinkResetOnce()
    {
        await this.test('concurrent posts of one reset link reset the password only once', async () => {
            let resetSetup = this.createResetSetup();
            let token = this.createValidToken(resetSetup);
            let sentContents = await Promise.all([
                this.postReset(resetSetup, token, this.newPassword, this.newPassword),
                this.postReset(resetSetup, token, this.newPassword, this.newPassword)
            ]);
            this.assert.deepStrictEqual([...sentContents].sort(), ['reset-error.html', 'reset-success.html']);
            this.assert.deepStrictEqual(resetSetup.updates, [1]);
        });
    }

    async testAMalformedTokenRendersTheErrorWithoutThrowing()
    {
        await this.test('a token with a multi-byte signature of the right length renders the reset error', async () => {
            let resetSetup = this.createResetSetup();
            let malformedToken = (Date.now()+60000)+'.'+'a'.repeat(63)+'é';
            let getContent = await this.sendRequest(resetSetup, 'GET', {email: this.userEmail, token: malformedToken});
            let postContent = await this.postReset(resetSetup, malformedToken, this.newPassword, this.newPassword);
            this.assert.strictEqual(getContent, 'reset-error.html');
            this.assert.strictEqual(postContent, 'reset-error.html');
            this.assert.strictEqual(resetSetup.updates.length, 0);
        });
    }

    async testAResetRouteStorageErrorAnswersAServerError()
    {
        await this.test('a storage error in the reset routes answers a server error instead of rejecting', async () => {
            let resetSetup = this.createResetSetup();
            resetSetup.forgotPassword.usersManager.loadUserByEmail = async () => Promise.reject({message: 'Storage.'});
            let getContent = await this.sendRequest(resetSetup, 'GET', {email: this.userEmail, token: 'invalid'});
            let postContent = await this.postReset(resetSetup, 'invalid', this.newPassword, this.newPassword);
            this.assert.strictEqual(getContent, '500|Reset password error.');
            this.assert.strictEqual(postContent, '500|Reset password error.');
        });
    }

}

module.exports.TestResetPassword = TestResetPassword;
