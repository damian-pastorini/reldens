/**
 *
 * Reldens - Test Firebase ID Token Verifier
 *
 */

const { BaseTest } = require('./base-test');
const { FirebaseIdTokenVerifier } = require('../lib/firebase/server/firebase-id-token-verifier');
const { FirebaseConst } = require('../lib/firebase/constants');
const { Encryptor } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');

class TestFirebaseIdTokenVerifier extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.passwordSecret = 'test-password-secret';
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
            passwordSecret: this.passwordSecret,
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

    createPasswordValidation(userData, storedPassword, updates)
    {
        return {
            loginManager: {
                usersManager: {
                    updateUserByEmail: async (email, updatePatch) => updates.push({email, updatePatch})
                }
            },
            user: {username: 'firebase-player', email: 'player@test.com', password: storedPassword},
            userData,
            isValid: false
        };
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

    async testTheVerifiedTokenSetsTheSignedUidAsPassword()
    {
        await this.test('a verified ID token sets the uid signed with the server secret as the password', async () => {
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
            this.assert.strictEqual(userData.password, Encryptor.generateHMAC('firebase-uid', this.passwordSecret));
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
            this.assert.strictEqual(
                sceneUserData.password,
                Encryptor.generateHMAC('firebase-uid', this.passwordSecret)
            );
            this.assert.strictEqual(capturedRequests.length, 1);
        });
    }

    async testTheExpiredVerifiedTokenIsRejected()
    {
        await this.test('a verified ID token is rejected after the verification expiration', async () => {
            let capturedRequests = [];
            let responseData = {users: [{localId: 'firebase-uid', email: 'player@test.com'}]};
            let verifier = this.createVerifier(responseData, capturedRequests);
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

    async testTheLegacyUidPasswordIsMigratedOnAVerifiedLogin()
    {
        await this.test('the legacy password made from the Firebase uid is migrated on a verified login', async () => {
            let verifier = this.createVerifier({users: [{localId: 'firebase-uid', email: 'player@test.com'}]}, []);
            let userData = await this.createVerifiedLoginData(verifier);
            let updates = [];
            let legacyPassword = Encryptor.encryptPassword('firebase-uid');
            let passwordValidation = this.createPasswordValidation(userData, legacyPassword, updates);
            this.assert.strictEqual(await verifier.migrateLegacyPassword(passwordValidation), true);
            this.assert.strictEqual(passwordValidation.isValid, true);
            this.assert.strictEqual(updates.length, 1);
            this.assert.strictEqual([...updates].shift().email, 'player@test.com');
            let migratedPassword = passwordValidation.user.password;
            this.assert.strictEqual([...updates].shift().updatePatch.password, migratedPassword);
            this.assert.strictEqual(Encryptor.validatePassword(userData.password, migratedPassword), true);
            this.assert.strictEqual(Encryptor.validatePassword('firebase-uid', migratedPassword), false);
        });
    }

    async testTheLegacyPasswordIsNotMigratedWithoutAVerifiedLogin()
    {
        await this.test('the legacy password is not migrated for a login data that was not verified', async () => {
            let verifier = this.createVerifier({}, []);
            let userData = this.createFirebaseLoginData('forged-token');
            let updates = [];
            let legacyPassword = Encryptor.encryptPassword('firebase-uid');
            let passwordValidation = this.createPasswordValidation(userData, legacyPassword, updates);
            this.assert.strictEqual(await verifier.migrateLegacyPassword(passwordValidation), false);
            this.assert.strictEqual(passwordValidation.isValid, false);
            this.assert.strictEqual(updates.length, 0);
            this.assert.strictEqual(passwordValidation.user.password, legacyPassword);
        });
    }

    async testTheLegacyPasswordIsNotMigratedWhenTheStoredHashDoesNotMatch()
    {
        await this.test('the password is not migrated when the stored hash is not from the Firebase uid', async () => {
            let verifier = this.createVerifier({users: [{localId: 'firebase-uid', email: 'player@test.com'}]}, []);
            let userData = await this.createVerifiedLoginData(verifier);
            let updates = [];
            let storedPassword = Encryptor.encryptPassword('another-account-password');
            let passwordValidation = this.createPasswordValidation(userData, storedPassword, updates);
            this.assert.strictEqual(await verifier.migrateLegacyPassword(passwordValidation), false);
            this.assert.strictEqual(passwordValidation.isValid, false);
            this.assert.strictEqual(updates.length, 0);
            this.assert.strictEqual(passwordValidation.user.password, storedPassword);
        });
    }

}

module.exports.TestFirebaseIdTokenVerifier = TestFirebaseIdTokenVerifier;
