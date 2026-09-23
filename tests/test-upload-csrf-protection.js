/**
 *
 * Reldens - Test Upload Csrf Protection
 *
 */

const { BaseTest } = require('./base-test');
const { UploadCsrfProtection } = require('../lib/admin/server/upload-csrf-protection');

class TestUploadCsrfProtection extends BaseTest
{

    runUploadCsrfCheck(enabled, uploadBody)
    {
        let checkResult = {nextCalls: 0, statusCode: 0};
        let adminManager = {router: {csrfProtection: {enabled, ignoredPaths: ['/tileset-analyzer']}}};
        let middleware = UploadCsrfProtection.createMiddleware(adminManager, '/objects-import');
        let request = {
            method: 'POST',
            path: '/objects-import',
            session: {csrfToken: 'session-token-a'},
            body: uploadBody,
            headers: {}
        };
        let response = {
            status: (statusCode) => {
                checkResult.statusCode = statusCode;
                return response;
            },
            send: () => response
        };
        middleware(request, response, () => checkResult.nextCalls++);
        checkResult.ignoredPaths = adminManager.router.csrfProtection.ignoredPaths;
        return checkResult;
    }

    async testTheUploadRouteIsExcludedFromTheRouterCheck()
    {
        await this.test('the upload route path is excluded from the administration router check', async () => {
            let checkResult = this.runUploadCsrfCheck(true, {_csrf: 'session-token-a'});
            this.assert.deepStrictEqual(checkResult.ignoredPaths, ['/tileset-analyzer', '/objects-import']);
        });
    }

    async testTheTokenParsedAfterTheUploaderIsAccepted()
    {
        await this.test('the token field parsed by the uploader is accepted when it matches the session', async () => {
            let checkResult = this.runUploadCsrfCheck(true, {_csrf: 'session-token-a'});
            this.assert.strictEqual(checkResult.nextCalls, 1);
            this.assert.strictEqual(checkResult.statusCode, 0);
        });
    }

    async testTheTokenOfAnotherSessionIsRejected()
    {
        await this.test('the token of another session is rejected after the uploader', async () => {
            let checkResult = this.runUploadCsrfCheck(true, {_csrf: 'session-token-b'});
            this.assert.strictEqual(checkResult.nextCalls, 0);
            this.assert.strictEqual(checkResult.statusCode, 403);
        });
    }

    async testTheUploadWithoutTokenIsRejected()
    {
        await this.test('an upload without the token field is rejected', async () => {
            let checkResult = this.runUploadCsrfCheck(true, {});
            this.assert.strictEqual(checkResult.nextCalls, 0);
            this.assert.strictEqual(checkResult.statusCode, 403);
        });
    }

    async testTheDisabledProtectionAcceptsTheUpload()
    {
        await this.test('the upload is accepted without a token when the protection is disabled', async () => {
            let checkResult = this.runUploadCsrfCheck(false, {});
            this.assert.strictEqual(checkResult.nextCalls, 1);
            this.assert.strictEqual(checkResult.statusCode, 0);
        });
    }

}

module.exports.TestUploadCsrfProtection = TestUploadCsrfProtection;
