/**
 *
 * Reldens - Test Authentication Registration
 *
 * Tests the values the server accepts on the registration and the login, sent directly through the game manager as a
 * modified client would do it: the invalid usernames, emails and passwords are rejected and create nothing, the email
 * already in use is rejected and counted, an existing username goes through the login path, the exact limits are
 * accepted, and the login handles metacharacters, oversized values, another letter case and an empty password. The
 * limits come from the stored config.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { DirectFormSubmit } = require('./helpers/direct-form-submit');
const { Login } = require('./helpers/login');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { SecurityApi } = require('./helpers/security-api');
const { Selectors } = require('./selectors');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAuthenticationRegistration
{

    static async fetchLimits(gameConfig)
    {
        let limits = {};
        limits.usernameMinimum = Number(await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, 'server/security/registration/usernameMinimumLength'));
        limits.usernameMaximum = Number(await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, 'server/security/registration/usernameMaximumLength'));
        limits.emailMaximum = Number(await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, 'server/security/registration/emailMaximumLength'));
        limits.passwordMaximum = Number(await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, 'server/security/passwordMaximumLength'));
        limits.passwordMinimum = Number(await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, 'client/players/password/minimumLength'));
        return limits;
    }

    static createInvalidCases(limits)
    {
        let uniqueName = DirectFormSubmit.createUniqueName();
        let validValues = {
            username: uniqueName,
            email: uniqueName+'@yourgame.com',
            password: DirectFormSubmit.VALID_PASSWORD
        };
        return [
            {...validValues, label: 'short username', username: 'x'.repeat(limits.usernameMinimum - 1)},
            {...validValues, label: 'long username', username: 'x'.repeat(limits.usernameMaximum + 1)},
            {...validValues, label: 'invalid characters', username: uniqueName+' !'},
            {...validValues, label: 'malformed email', email: 'not-an-email'},
            {...validValues, label: 'long email', email: 'x'.repeat(limits.emailMaximum)+'@yourgame.com'},
            {...validValues, label: 'long password', password: 'x'.repeat(limits.passwordMaximum + 1)},
            {...validValues, label: 'number username', username: 12345},
            {...validValues, label: 'number email', email: 12345}
        ];
    }

    static async runInvalidValuesTest(page, screenshots, gameConfig, longRun)
    {
        let invalidCases = TestAuthenticationRegistration.createInvalidCases(
            await TestAuthenticationRegistration.fetchLimits(gameConfig)
        );
        for(let invalidCase of invalidCases){
            await DirectFormSubmit.submit(
                page,
                DirectFormSubmit.createRegistration(invalidCase.username, invalidCase.email, invalidCase.password),
                true
            );
            await DirectFormSubmit.expectFormError(page, Selectors.registerResponse.error, longRun, invalidCase.label);
            expect(
                await E2eSeedAndRestoreApi.loadRows(gameConfig, 'users', {email: String(invalidCase.email)}),
                invalidCase.label+' must create nothing'
            ).toEqual([]);
        }
        await screenshots.capture(page, 'invalid-registration-values');
    }

    static async runEmailInUseTest(page, screenshots, gameConfig, longRun)
    {
        for(let email of [gameConfig.adminUser, gameConfig.adminUser.toUpperCase()]){
            let username = DirectFormSubmit.createUniqueName();
            await DirectFormSubmit.submit(
                page,
                DirectFormSubmit.createRegistration(username, email, DirectFormSubmit.VALID_PASSWORD),
                true
            );
            await DirectFormSubmit.expectFormError(page, Selectors.registerResponse.error, longRun, email);
            expect(await E2eSeedAndRestoreApi.loadRows(gameConfig, 'users', {username}), email).toEqual([]);
            expect(await SecurityApi.fetchIdentityHits(gameConfig, username), 'The attempt must count as a failed login').toBe(1);
        }
        await screenshots.capture(page, 'registration-email-in-use');
    }

    static async runExistingUsernameTest(page, screenshots, gameConfig, longRun)
    {
        let usernameFilter = {username: gameConfig.e2eUsername};
        let storedUser = (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'users', usernameFilter)).shift();
        let newEmail = DirectFormSubmit.createUniqueName()+'@yourgame.com';
        await DirectFormSubmit.submit(
            page,
            DirectFormSubmit.createRegistration(gameConfig.e2eUsername, newEmail, 'e2e-wrong-password'),
            true
        );
        await DirectFormSubmit.expectFormError(page, Selectors.registerResponse.error, longRun, 'Wrong password');
        await DirectFormSubmit.submit(
            page,
            DirectFormSubmit.createRegistration(gameConfig.e2eUsername, newEmail, gameConfig.e2ePassword),
            true
        );
        await DirectFormSubmit.expectPlayerSelection(page, longRun, 'The correct password logs into the account');
        let loggedUser = (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'users', usernameFilter)).shift();
        expect(loggedUser, 'Only the login counters must change').toEqual({
            ...storedUser,
            updated_at: loggedUser.updated_at,
            login_count: Number(storedUser.login_count) + 1
        });
        expect(await E2eSeedAndRestoreApi.loadRows(gameConfig, 'users', {email: newEmail}), 'No account must be created').toEqual([]);
        await screenshots.capture(page, 'registration-existing-username');
    }

    static async runExactLimitsTest(page, screenshots, gameConfig, longRun)
    {
        let limits = await TestAuthenticationRegistration.fetchLimits(gameConfig);
        let uniqueName = DirectFormSubmit.createUniqueName();
        let exactCases = [
            {username: uniqueName.slice(-limits.usernameMinimum), password: DirectFormSubmit.VALID_PASSWORD},
            {username: uniqueName.padEnd(limits.usernameMaximum, 'x'), password: 'p'.repeat(limits.passwordMinimum)},
            {username: uniqueName+'max', password: 'p'.repeat(limits.passwordMaximum)}
        ];
        for(let exactCase of exactCases){
            let email = exactCase.username+'@yourgame.com';
            await DirectFormSubmit.submit(
                page,
                DirectFormSubmit.createRegistration(exactCase.username, email, exactCase.password),
                true
            );
            await DirectFormSubmit.expectPlayerSelection(page, longRun, exactCase.username);
            expect((await E2eSeedAndRestoreApi.loadRows(gameConfig, 'users', {email})).length, exactCase.username).toBe(1);
        }
        await screenshots.capture(page, 'registration-exact-limits');
    }

    static async runLoginValuesTest(page, screenshots, gameConfig, longRun)
    {
        let rejectedLogins = [
            {label: 'SQL metacharacters', username: "' OR '1'='1' -- ", password: 'e2e'},
            {label: 'oversized username', username: 'x'.repeat(5000), password: 'e2e'},
            {label: 'empty password', username: gameConfig.e2eUsername, password: ''}
        ];
        for(let rejectedLogin of rejectedLogins){
            await DirectFormSubmit.submit(page, {
                formId: DirectFormSubmit.LOGIN_FORM_ID,
                username: rejectedLogin.username,
                password: rejectedLogin.password
            }, false);
            await DirectFormSubmit.expectFormError(page, Selectors.login.error, longRun, rejectedLogin.label);
        }
        await DirectFormSubmit.submit(page, {
            formId: DirectFormSubmit.LOGIN_FORM_ID,
            username: gameConfig.e2eUsername.toUpperCase(),
            password: gameConfig.e2ePassword
        }, false);
        await DirectFormSubmit.expectPlayerSelection(page, longRun, 'Another letter case');
        await screenshots.capture(page, 'login-direct-values');
    }

    static async runNewAccountLoginTest(page, screenshots, gameConfig, longRun)
    {
        let username = DirectFormSubmit.createUniqueName();
        await DirectFormSubmit.submit(
            page,
            DirectFormSubmit.createRegistration(
                username,
                username+'@yourgame.com',
                DirectFormSubmit.VALID_PASSWORD
            ),
            true
        );
        await DirectFormSubmit.expectPlayerSelection(page, longRun, 'The new account');
        await Login.loginToSelection(page, username, DirectFormSubmit.VALID_PASSWORD, longRun);
        await screenshots.capture(page, 'new-account-logged-in-again');
    }

    static run()
    {
        test.describe('Authentication Registration', () => {
            test('invalid registration values are rejected by the server', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAuthenticationRegistration.runInvalidValuesTest(page, screenshots, gameConfig, longRun);
            });
            test('registration with an email in use is rejected and counted', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAuthenticationRegistration.runEmailInUseTest(page, screenshots, gameConfig, longRun);
            });
            test('registration with an existing username goes through the login path', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAuthenticationRegistration.runExistingUsernameTest(page, screenshots, gameConfig, longRun);
            });
            test('registration accepts the exact limits', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAuthenticationRegistration.runExactLimitsTest(page, screenshots, gameConfig, longRun);
            });
            test('login handles the direct values', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAuthenticationRegistration.runLoginValuesTest(page, screenshots, gameConfig, longRun);
            });
            test('new account logs in again with its credentials', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAuthenticationRegistration.runNewAccountLoginTest(page, screenshots, gameConfig, longRun);
            });
        });
    }

}

TestAuthenticationRegistration.run();
