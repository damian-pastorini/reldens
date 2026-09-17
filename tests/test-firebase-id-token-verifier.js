/**
 *
 * Reldens - Test Firebase ID Token Verifier
 *
 */

const { BaseTest } = require('./base-test');
const { FirebaseIdTokenVerifier } = require('../lib/firebase/server/firebase-id-token-verifier');
const { FirebaseConst } = require('../lib/firebase/constants');
const { sc } = require('@reldens/utils');

class TestFirebaseIdTokenVerifier extends BaseTest
{

    captureRequest(capturedRequests, responseData, url, options)
    {
        capturedRequests.push({url, options});
        return {json: async () => responseData};
    }

    createVerifier(responseData, capturedRequests)
    {
        return new FirebaseIdTokenVerifier({
            apiKey: 'test-api-key',
            fetchFunction: async (url, options) => this.captureRequest(capturedRequests, responseData, url, options)
        });
    }

    createFirebaseLoginData(firebaseIdToken)
    {
        return {
            isFirebaseLogin: true,
            firebaseUid: 'firebase-uid',
            firebaseIdToken,
            username: 'firebase-player',
            email: 'changed@test.com',
            password: 'client-password'
        };
    }

    async testTheVerifiedTokenSetsTheUidAsPassword()
    {
        await this.test('a verified ID token sets the Firebase uid as the login password', async () => {
            let capturedRequests = [];
            let responseData = {users: [{localId: 'firebase-uid', email: 'player@test.com'}]};
            let verifier = this.createVerifier(responseData, capturedRequests);
            let verifyResult = await verifier.verify('valid-token', 'firebase-uid');
            this.assert.strictEqual(verifyResult, true);
            this.assert.strictEqual(capturedRequests.length, 1);
            let request = [...capturedRequests].shift();
            this.assert.strictEqual(request.url, FirebaseConst.IDENTITY_TOOLKIT_LOOKUP_URL+'test-api-key');
            this.assert.strictEqual(request.options.body, sc.toJsonString({idToken: 'valid-token'}));
            let userData = this.createFirebaseLoginData('valid-token');
            this.assert.strictEqual(verifier.applyVerifiedLogin(userData), true);
            this.assert.strictEqual(userData.password, 'firebase-uid');
            this.assert.strictEqual(userData.email, 'player@test.com');
            this.assert.strictEqual(userData.username, 'firebase-player');
        });
    }

    async testTheVerifiedLoginIsReusedForLaterRoomJoins()
    {
        await this.test('the verified login is accepted again for later room joins without a new lookup', async () => {
            let capturedRequests = [];
            let responseData = {users: [{localId: 'firebase-uid', email: 'player@test.com'}]};
            let verifier = this.createVerifier(responseData, capturedRequests);
            await verifier.verify('valid-token', 'firebase-uid');
            verifier.applyVerifiedLogin(this.createFirebaseLoginData('valid-token'));
            let sceneUserData = this.createFirebaseLoginData('valid-token');
            this.assert.strictEqual(verifier.applyVerifiedLogin(sceneUserData), true);
            this.assert.strictEqual(sceneUserData.password, 'firebase-uid');
            this.assert.strictEqual(capturedRequests.length, 1);
        });
    }

    async testTheUidMismatchIsRejected()
    {
        await this.test('an ID token for another Firebase user is rejected', async () => {
            let capturedRequests = [];
            let responseData = {users: [{localId: 'another-uid', email: 'player@test.com'}]};
            let verifier = this.createVerifier(responseData, capturedRequests);
            let verifyResult = await verifier.verify('valid-token', 'firebase-uid');
            this.assert.strictEqual(verifyResult, false);
            let userData = this.createFirebaseLoginData('valid-token');
            this.assert.strictEqual(verifier.applyVerifiedLogin(userData), false);
            this.assert.strictEqual(userData.username, '');
        });
    }

    async testTheInvalidTokenLookupIsRejected()
    {
        await this.test('an ID token rejected by the Identity Toolkit lookup is rejected', async () => {
            let capturedRequests = [];
            let responseData = {error: {code: 400, message: 'INVALID_ID_TOKEN'}};
            let verifier = this.createVerifier(responseData, capturedRequests);
            let verifyResult = await verifier.verify('invalid-token', 'firebase-uid');
            this.assert.strictEqual(verifyResult, false);
            this.assert.strictEqual(verifier.applyVerifiedLogin(this.createFirebaseLoginData('invalid-token')), false);
        });
    }

    async testTheLookupRequestFailureIsRejected()
    {
        await this.test('a failed Identity Toolkit request is rejected', async () => {
            let verifier = new FirebaseIdTokenVerifier({
                apiKey: 'test-api-key',
                fetchFunction: () => Promise.reject(new Error('Network error'))
            });
            let verifyResult = await verifier.verify('valid-token', 'firebase-uid');
            this.assert.strictEqual(verifyResult, false);
            this.assert.strictEqual(verifier.applyVerifiedLogin(this.createFirebaseLoginData('valid-token')), false);
        });
    }

    async testADifferentTokenForAVerifiedUserIsRejected()
    {
        await this.test('a different ID token for an already verified user is rejected', async () => {
            let capturedRequests = [];
            let responseData = {users: [{localId: 'firebase-uid', email: 'player@test.com'}]};
            let verifier = this.createVerifier(responseData, capturedRequests);
            await verifier.verify('valid-token', 'firebase-uid');
            let userData = this.createFirebaseLoginData('forged-token');
            this.assert.strictEqual(verifier.applyVerifiedLogin(userData), false);
            this.assert.strictEqual(userData.username, '');
        });
    }

    async testTheNonFirebaseLoginIsNotChanged()
    {
        await this.test('a login request without the Firebase flag is not changed', async () => {
            let verifier = this.createVerifier({}, []);
            let userData = {username: 'player', password: 'secret'};
            this.assert.strictEqual(verifier.applyVerifiedLogin(userData), false);
            this.assert.strictEqual(userData.username, 'player');
            this.assert.strictEqual(userData.password, 'secret');
        });
    }

}

module.exports.TestFirebaseIdTokenVerifier = TestFirebaseIdTokenVerifier;
