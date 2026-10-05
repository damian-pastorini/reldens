/**
 *
 * Reldens - Test Upload Csrf Protection
 *
 */

const { BaseTest } = require('./base-test');
const { ObjectsImporterSubscriber } = require('../lib/admin/server/subscribers/objects-importer-subscriber');

class TestUploadCsrfProtection extends BaseTest
{

    setupObjectsImportRoute(enabled)
    {
        let routeSetup = {postHandlers: [], uploader: () => true};
        routeSetup.adminManager = {
            rootPath: '/reldens-admin',
            router: {
                csrfProtection: {enabled, ignoredPaths: ['/tileset-analyzer']},
                adminRouter: {
                    get: () => true,
                    post: (path, ...handlers) => routeSetup.postHandlers.push(...handlers)
                }
            }
        };
        let subscriber = Object.create(ObjectsImporterSubscriber.prototype);
        subscriber.objectsImportPath = '/objects-import';
        subscriber.rootPath = '';
        subscriber.isAuthenticated = () => true;
        subscriber.uploader = routeSetup.uploader;
        subscriber.setupRoutes(routeSetup.adminManager);
        return routeSetup;
    }

    runUploadCsrfCheck(enabled, uploadBody)
    {
        let routeSetup = this.setupObjectsImportRoute(enabled);
        let checkResult = {nextCalls: 0, statusCode: 0};
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
        routeSetup.postHandlers[2](request, response, () => checkResult.nextCalls++);
        return checkResult;
    }

    async testTheUploadRouteChecksTheTokenAfterTheUploader()
    {
        await this.test('the upload route skips the router check and is checked after the uploader', async () => {
            let routeSetup = this.setupObjectsImportRoute(true);
            this.assert.deepStrictEqual(
                routeSetup.adminManager.router.csrfProtection.ignoredPaths,
                ['/tileset-analyzer', '/objects-import']
            );
            this.assert.strictEqual(routeSetup.postHandlers[1], routeSetup.uploader);
            this.assert.strictEqual(routeSetup.postHandlers.length, 4);
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

    async testTheMultiByteTokenOfTheSameLengthIsRejectedWithoutThrowing()
    {
        await this.test('a multi-byte token with the session token length is rejected without throwing', async () => {
            let checkResult = this.runUploadCsrfCheck(true, {_csrf: 'session-token-é'});
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
