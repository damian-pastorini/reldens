/**
 *
 * Reldens - Test Authentication Firebase
 *
 * Tests the Firebase login with the plugin enabled by the e2e endpoints and a token verifier that answers from the
 * users given by each test: the disabled form, the provider buttons, the verified login creating an account with the
 * firebase origin, and the rejected logins for an unverified email, an expired, missing or different token, a
 * mismatched user ID and a username that belongs to another email.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { DirectFormSubmit } = require('./helpers/direct-form-submit');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { SecurityApi } = require('./helpers/security-api');
const { UsersConst } = require('../../lib/users/constants');
const { FirebaseConst } = require('../../lib/firebase/constants');
const { GameConst } = require('../../lib/game/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAuthenticationFirebase
{

    static FORM_ID = 'firebase-login';
    static FORM_ERROR = '#firebase-login .response-error';
    static ROW_CONTAINER = '.firebase-row-container';
    static AUTH_BUTTON = '.firebase-auth-btn';

    static createFirebaseUser(emailVerified)
    {
        let firebaseUser = {localId: 'uid-'+DirectFormSubmit.createUniqueName(), emailVerified};
        firebaseUser.idToken = 'token-'+firebaseUser.localId;
        firebaseUser.email = firebaseUser.localId+'@e2e-firebase.test';
        return firebaseUser;
    }

    static async createEnabledFirebaseUser(gameConfig)
    {
        let firebaseUser = TestAuthenticationFirebase.createFirebaseUser(true);
        await TestAuthenticationFirebase.enableFirebase(gameConfig, [firebaseUser]);
        return firebaseUser;
    }

    static async enableFirebase(gameConfig, firebaseUsers)
    {
        let users = {};
        for(let firebaseUser of firebaseUsers){
            users[firebaseUser.idToken] = {
                localId: firebaseUser.localId,
                email: firebaseUser.email,
                emailVerified: firebaseUser.emailVerified
            };
        }
        await SecurityApi.request(gameConfig, 'POST', '/api/e2e/firebase/enable', {users});
    }

    static async verifyToken(page, idToken, uid)
    {
        return (await (await page.request.post(
            FirebaseConst.ROUTE_PATHS.VERIFY_ID_TOKEN,
            {data: {idToken, uid}}
        )).json()).isSuccess;
    }

    static async submitFirebaseLogin(page, firebaseUser, idToken, username = DirectFormSubmit.createUniqueName())
    {
        await DirectFormSubmit.submit(page, {
            formId: TestAuthenticationFirebase.FORM_ID,
            username,
            email: firebaseUser.email,
            firebaseUid: firebaseUser.localId,
            firebaseIdToken: idToken
        }, true);
    }

    static async expectRejected(page, gameConfig, longRun, firebaseUser, label)
    {
        await DirectFormSubmit.expectFormError(page, TestAuthenticationFirebase.FORM_ERROR, longRun, label);
        expect(await E2eSeedAndRestoreApi.loadRows(gameConfig, 'users', {email: firebaseUser.email}), label).toEqual([]);
    }

    static async verifyAndSubmit(page, gameConfig, firebaseUser, idToken)
    {
        await TestAuthenticationFirebase.enableFirebase(gameConfig, [firebaseUser]);
        expect(await TestAuthenticationFirebase.verifyToken(page, firebaseUser.idToken, firebaseUser.localId)).toBe(true);
        await TestAuthenticationFirebase.submitFirebaseLogin(page, firebaseUser, idToken);
    }

    static async runDisabledTest(page, screenshots, gameConfig)
    {
        await SecurityApi.request(gameConfig, 'POST', '/api/e2e/firebase/disable', {});
        await DirectFormSubmit.openPage(page);
        await expect(page.locator(TestAuthenticationFirebase.ROW_CONTAINER)).toBeHidden();
        expect(await (await page.request.get(GameConst.ROUTE_PATHS.FIREBASE)).json()).toEqual({enabled: false});
        await screenshots.capture(page, 'firebase-disabled');
    }

    static async runProviderButtonsTest(page, screenshots, gameConfig)
    {
        await TestAuthenticationFirebase.enableFirebase(gameConfig, []);
        await DirectFormSubmit.openPage(page);
        await expect(page.locator(TestAuthenticationFirebase.ROW_CONTAINER)).toBeVisible();
        await expect(page.locator(TestAuthenticationFirebase.AUTH_BUTTON)).toHaveCount(
            FirebaseConst.DEFAULT_PROVIDERS_KEYS.length
        );
        await screenshots.capture(page, 'firebase-provider-buttons');
    }

    static async runVerifiedLoginTest(page, screenshots, gameConfig, longRun)
    {
        let firebaseUser = await TestAuthenticationFirebase.createEnabledFirebaseUser(gameConfig);
        expect(await TestAuthenticationFirebase.verifyToken(page, firebaseUser.idToken, firebaseUser.localId)).toBe(true);
        let username = DirectFormSubmit.createUniqueName();
        await TestAuthenticationFirebase.submitFirebaseLogin(page, firebaseUser, firebaseUser.idToken, username);
        await DirectFormSubmit.expectPlayerSelection(page, longRun, 'The verified login must create the account');
        let storedUser = (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'users', {username})).shift();
        expect(storedUser.email).toBe(firebaseUser.email);
        expect(storedUser.origin).toBe(UsersConst.ORIGINS.FIREBASE);
        await screenshots.capture(page, 'firebase-verified-login');
    }

    static async runUnverifiedEmailTest(page, gameConfig, longRun)
    {
        let firebaseUser = TestAuthenticationFirebase.createFirebaseUser(false);
        await TestAuthenticationFirebase.verifyAndSubmit(page, gameConfig, firebaseUser, firebaseUser.idToken);
        await TestAuthenticationFirebase.expectRejected(page, gameConfig, longRun, firebaseUser, 'Unverified email');
    }

    static async runExpiredTokenTest(page, gameConfig, longRun)
    {
        let firebaseUser = await TestAuthenticationFirebase.createEnabledFirebaseUser(gameConfig);
        expect(await TestAuthenticationFirebase.verifyToken(page, firebaseUser.idToken, firebaseUser.localId)).toBe(true);
        await SecurityApi.request(gameConfig, 'POST', '/api/e2e/firebase/expire', {uid: firebaseUser.localId});
        await TestAuthenticationFirebase.submitFirebaseLogin(page, firebaseUser, firebaseUser.idToken);
        await TestAuthenticationFirebase.expectRejected(page, gameConfig, longRun, firebaseUser, 'Expired verification');
    }

    static async runMismatchedUidTest(page, gameConfig)
    {
        let firebaseUser = await TestAuthenticationFirebase.createEnabledFirebaseUser(gameConfig);
        expect(await TestAuthenticationFirebase.verifyToken(page, firebaseUser.idToken, 'uid-e2e-other')).toBe(false);
        expect(await TestAuthenticationFirebase.verifyToken(page, 'token-e2e-unknown', firebaseUser.localId)).toBe(false);
    }

    static async runNotVerifiedLoginTest(page, gameConfig, longRun)
    {
        let firebaseUser = await TestAuthenticationFirebase.createEnabledFirebaseUser(gameConfig);
        await TestAuthenticationFirebase.submitFirebaseLogin(page, firebaseUser, firebaseUser.idToken);
        await TestAuthenticationFirebase.expectRejected(page, gameConfig, longRun, firebaseUser, 'No verified token');
    }

    static async runOtherTokenTest(page, gameConfig, longRun)
    {
        let firebaseUser = TestAuthenticationFirebase.createFirebaseUser(true);
        await TestAuthenticationFirebase.verifyAndSubmit(page, gameConfig, firebaseUser, 'token-e2e-other');
        await TestAuthenticationFirebase.expectRejected(page, gameConfig, longRun, firebaseUser, 'Another ID token');
    }

    static async runOtherEmailUsernameTest(page, gameConfig, longRun)
    {
        let firebaseUser = TestAuthenticationFirebase.createFirebaseUser(true);
        let usernameFilter = {username: gameConfig.e2eUsername};
        let storedUser = (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'users', usernameFilter)).shift();
        await TestAuthenticationFirebase.enableFirebase(gameConfig, [firebaseUser]);
        expect(await TestAuthenticationFirebase.verifyToken(page, firebaseUser.idToken, firebaseUser.localId)).toBe(true);
        await TestAuthenticationFirebase.submitFirebaseLogin(page, firebaseUser, firebaseUser.idToken, gameConfig.e2eUsername);
        await DirectFormSubmit.expectFormError(page, TestAuthenticationFirebase.FORM_ERROR, longRun, 'Another email');
        expect((await E2eSeedAndRestoreApi.loadRows(gameConfig, 'users', usernameFilter)).shift().email).toBe(storedUser.email);
    }

    static run()
    {
        test.describe('Authentication Firebase', () => {
            test('firebase disabled keeps the form hidden', async ({ page, screenshots, gameConfig }) => {
                await TestAuthenticationFirebase.runDisabledTest(page, screenshots, gameConfig);
            });
            test('firebase enabled shows the provider buttons', async ({ page, screenshots, gameConfig }) => {
                await TestAuthenticationFirebase.runProviderButtonsTest(page, screenshots, gameConfig);
            });
            test('verified firebase login creates the account with the firebase origin', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAuthenticationFirebase.runVerifiedLoginTest(page, screenshots, gameConfig, longRun);
            });
            test('firebase login with an unverified email is rejected', async ({ page, gameConfig, longRun }) => {
                await TestAuthenticationFirebase.runUnverifiedEmailTest(page, gameConfig, longRun);
            });
            test('firebase login with an expired verification is rejected', async ({ page, gameConfig, longRun }) => {
                await TestAuthenticationFirebase.runExpiredTokenTest(page, gameConfig, longRun);
            });
            test('firebase token with a mismatched user ID or unknown is not verified', async ({ page, gameConfig }) => {
                await TestAuthenticationFirebase.runMismatchedUidTest(page, gameConfig);
            });
            test('firebase login without a verified token is rejected', async ({ page, gameConfig, longRun }) => {
                await TestAuthenticationFirebase.runNotVerifiedLoginTest(page, gameConfig, longRun);
            });
            test('firebase login with another ID token is rejected', async ({ page, gameConfig, longRun }) => {
                await TestAuthenticationFirebase.runOtherTokenTest(page, gameConfig, longRun);
            });
            test('firebase login with a username of another email is rejected', async ({ page, gameConfig, longRun }) => {
                await TestAuthenticationFirebase.runOtherEmailUsernameTest(page, gameConfig, longRun);
            });
        });
    }

}

TestAuthenticationFirebase.run();
