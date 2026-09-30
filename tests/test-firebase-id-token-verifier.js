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

    constructor(config)
    {
        super(config);
        this.verifiedResponse = {users: [{localId: 'firebase-uid', email: 'player@test.com', emailVerified: true}]};
    }

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

    async createVerifiedLoginData(verifier)
    {
        await verifier.verify('valid-token', 'firebase-uid');
        let userData = this.createFirebaseLoginData('valid-token');
        verifier.applyVerifiedLogin(userData);
        return userData;
    }

    validateByEmail(verifier, userData, storedEmail)
    {
        let passwordValidation = {user: {username: 'firebase-player', email: storedEmail}, userData, isValid: false};
        passwordValidation.validationResult = verifier.validateVerifiedEmailLogin(passwordValidation);
        return passwordValidation;
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

    async testTheVerifiedTokenSetsTheVerifiedEmailAndARandomPassword()
    {
        await this.test('a verified ID token sets the verified email and a random password on the login', async () => {
            let capturedRequests = [];
            let verifier = this.createVerifier(this.verifiedResponse, capturedRequests);
            let verifyResult = await verifier.verify('valid-token', 'firebase-uid');
            this.assert.strictEqual(verifyResult, true);
            this.assert.strictEqual(capturedRequests.length, 1);
            let request = [...capturedRequests].shift();
            this.assert.strictEqual(request.url, FirebaseConst.IDENTITY_TOOLKIT_LOOKUP_URL+'test-api-key');
            this.assert.strictEqual(request.options.body, sc.toJsonString({idToken: 'valid-token'}));
            let firstUserData = this.createFirebaseLoginData('valid-token');
            let secondUserData = this.createFirebaseLoginData('valid-token');
            this.assert.strictEqual(verifier.applyVerifiedLogin(firstUserData), true);
            this.assert.strictEqual(verifier.applyVerifiedLogin(secondUserData), true);
            this.assert.strictEqual(firstUserData.email, 'player@test.com');
            this.assert.strictEqual(firstUserData.username, 'firebase-player');
            this.assert.match(firstUserData.password, /^[A-Za-z0-9_-]{43}$/);
            this.assert.notStrictEqual(firstUserData.password, secondUserData.password);
        });
    }

    async testTheVerifiedLoginIsReusedForLaterRoomJoins()
    {
        await this.test('the verified login is accepted again for later room joins without a new lookup', async () => {
            let capturedRequests = [];
            let verifier = this.createVerifier(this.verifiedResponse, capturedRequests);
            await verifier.verify('valid-token', 'firebase-uid');
            verifier.applyVerifiedLogin(this.createFirebaseLoginData('valid-token'));
            this.assert.strictEqual(verifier.applyVerifiedLogin(this.createFirebaseLoginData('valid-token')), true);
            this.assert.strictEqual(capturedRequests.length, 1);
        });
    }

    async testTheUnverifiedEmailIsRejected()
    {
        await this.test('a verified ID token of a Firebase account without a verified email is rejected', async () => {
            let responseData = {users: [{localId: 'firebase-uid', email: 'player@test.com', emailVerified: false}]};
            let verifier = this.createVerifier(responseData, []);
            this.assert.strictEqual(await verifier.verify('valid-token', 'firebase-uid'), true);
            let userData = this.createFirebaseLoginData('valid-token');
            this.assert.strictEqual(verifier.applyVerifiedLogin(userData), false);
            this.assert.strictEqual(userData.username, '');
        });
    }

    async testTheExpiredVerifiedTokenIsRejected()
    {
        await this.test('a verified ID token is rejected after the verification expiration', async () => {
            let verifier = this.createVerifier(this.verifiedResponse, []);
            await verifier.verify('valid-token', 'firebase-uid');
            verifier.verifiedUsers.get('firebase-uid').expiresAt = sc.getTime()-1;
            let userData = this.createFirebaseLoginData('valid-token');
            this.assert.strictEqual(verifier.applyVerifiedLogin(userData), false);
            this.assert.strictEqual(userData.username, '');
            this.assert.strictEqual(verifier.verifiedUsers.has('firebase-uid'), false);
        });
    }

    async testTheUidMismatchIsRejected()
    {
        await this.test('an ID token for another Firebase user is rejected', async () => {
            let responseData = {users: [{localId: 'another-uid', email: 'player@test.com', emailVerified: true}]};
            let verifier = this.createVerifier(responseData, []);
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
            let responseData = {error: {code: 400, message: 'INVALID_ID_TOKEN'}};
            let verifier = this.createVerifier(responseData, []);
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
            let verifier = this.createVerifier(this.verifiedResponse, []);
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

    async testTheVerifiedEmailValidatesTheUsernameAccount()
    {
        await this.test('a verified login is valid when the username account has the verified email', async () => {
            let verifier = this.createVerifier(this.verifiedResponse, []);
            let userData = await this.createVerifiedLoginData(verifier);
            let passwordValidation = this.validateByEmail(verifier, userData, 'Player@Test.com');
            this.assert.strictEqual(passwordValidation.validationResult, true);
            this.assert.strictEqual(passwordValidation.isValid, true);
        });
    }

    async testTheUsernameOfAnotherEmailIsRejected()
    {
        await this.test('a verified login is rejected when the username account has another email', async () => {
            let verifier = this.createVerifier(this.verifiedResponse, []);
            let userData = await this.createVerifiedLoginData(verifier);
            let passwordValidation = this.validateByEmail(verifier, userData, 'another@test.com');
            this.assert.strictEqual(passwordValidation.validationResult, false);
            this.assert.strictEqual(passwordValidation.isValid, false);
        });
    }

    async testTheNotVerifiedLoginIsNotValidatedByEmail()
    {
        await this.test('a login data that was not verified is never validated by the email', async () => {
            let verifier = this.createVerifier({}, []);
            let userData = this.createFirebaseLoginData('forged-token');
            userData.email = 'player@test.com';
            let passwordValidation = this.validateByEmail(verifier, userData, 'player@test.com');
            this.assert.strictEqual(passwordValidation.validationResult, false);
            this.assert.strictEqual(passwordValidation.isValid, false);
        });
    }

    async testTheVerifiedUsersCacheKeepsTheConfiguredMaximum()
    {
        await this.test('the verified users cache keeps the maximum entries and drops the oldest uid', async () => {
            let verifier = new FirebaseIdTokenVerifier({
                apiKey: 'test-api-key',
                verifiedUsersMax: 2,
                fetchFunction: async (url, options) => ({
                    json: async () => ({users: [{localId: sc.toJson(options.body).idToken, email: 'player@test.com'}]})
                })
            });
            for(let uid of ['first-uid', 'second-uid', 'third-uid']){
                this.assert.strictEqual(await verifier.verify(uid, uid), true);
            }
            this.assert.strictEqual(verifier.verifiedUsers.size, 2);
            this.assert.deepStrictEqual([...verifier.verifiedUsers.keys()], ['second-uid', 'third-uid']);
        });
    }

}

module.exports.TestFirebaseIdTokenVerifier = TestFirebaseIdTokenVerifier;
