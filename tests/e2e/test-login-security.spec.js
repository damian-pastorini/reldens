/**
 *
 * Reldens - Test Login Security
 *
 * Tests the game login protections: uniform login errors, the login attempts lockout and its stored address block,
 * account bans, the registration, guests and joins limits per address, the address deny list and the forgot password
 * interval per user.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { Registration } = require('./helpers/registration');
const { SecurityApi } = require('./helpers/security-api');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestLoginSecurity
{

    static LOCKOUT_ATTEMPTS = 3;
    static DENY_DURATION_MS = 4000;
    static LOCAL_ADDRESSES = ['::1', '127.0.0.1'];

    static async runUniformErrorTest(page, screenshots, gameConfig, longRun)
    {
        let unknownUserError = await Login.submitLoginExpectingError(page, 'e2e-unknown-'+Date.now(), 'any', longRun);
        await screenshots.capture(page, 'unknown-user-error');
        let wrongPasswordError = await Login.submitLoginExpectingError(
            page,
            gameConfig.e2eUsername || 'root',
            'wrong-password-xyz',
            longRun
        );
        await screenshots.capture(page, 'wrong-password-error');
        expect(unknownUserError).toBe(wrongPasswordError);
    }

    static async runLockoutTest(page, screenshots, gameConfig, longRun)
    {
        let username = gameConfig.e2eUsername || 'root';
        let password = gameConfig.e2ePassword || 'root';
        await SecurityApi.updateSettings(gameConfig, {maxAttempts: TestLoginSecurity.LOCKOUT_ATTEMPTS});
        for(let attempt = 1; TestLoginSecurity.LOCKOUT_ATTEMPTS >= attempt; attempt++){
            await Login.submitLoginExpectingError(page, username, 'wrong-password-'+attempt, longRun);
        }
        await Login.submitLoginExpectingError(page, username, password, longRun);
        await screenshots.capture(page, 'valid-login-blocked');
        let storedBlocks = await SecurityApi.fetchStoredBlocks(gameConfig);
        expect(storedBlocks.length, 'The address block must be stored').toBeGreaterThan(0);
        expect([...storedBlocks].shift().expiresAt).toBeGreaterThan(Date.now());
        let restoredBlocks = await SecurityApi.restoreBlocks(gameConfig);
        expect(restoredBlocks, 'The stored block must be restored after a restart').toBeGreaterThan(0);
        await Login.submitLoginExpectingError(page, username, password, longRun);
        await screenshots.capture(page, 'valid-login-blocked-after-restart');
    }

    static async runBannedAccountTest(page, screenshots, gameConfig, longRun)
    {
        let username = gameConfig.e2eUsername3 || 'root3';
        let banResult = await SecurityApi.banUser(gameConfig, username);
        expect(banResult.ok, 'The test account must exist to be banned').toBeTruthy();
        await Login.submitLoginExpectingError(page, username, gameConfig.e2ePassword3 || 'root', longRun);
        await screenshots.capture(page, 'banned-account-rejected');
    }

    static async runRegistrationLimitTest(page, screenshots, longRun)
    {
        let suffix = String(Date.now());
        await SecurityApi.updateSettings(BaseE2eTest.gameConfig, {registrationMaxPerIp: 1});
        await Registration.submitRegistration(
            page,
            {username: 'e2ereg'+suffix, email: 'e2ereg'+suffix+'@yourgame.com', password: 'TestReg123'},
            longRun,
            screenshots
        );
        await page.waitForSelector(
            Selectors.characterSelect.container+':not(.hidden)',
            { timeout: TimeConstants.forLongRun(TimeConstants.CHARACTER_SCREEN, longRun) }
        );
        await Registration.submitRegistration(
            page,
            {username: 'e2eregb'+suffix, email: 'e2eregb'+suffix+'@yourgame.com', password: 'TestReg123'},
            longRun,
            screenshots
        );
        await expect(page.locator(Selectors.registerResponse.error)).not.toBeEmpty(
            { timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun) }
        );
        await expect(page.locator(Selectors.characterSelect.container+':not(.hidden)')).toHaveCount(0);
        await screenshots.capture(page, 'second-registration-rejected');
    }

    static async submitGuestLogin(page, longRun)
    {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await expect(page.locator(Selectors.login.guestForm)).toBeVisible(
            { timeout: TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, longRun) }
        );
        await page.click(Selectors.login.guestSubmit);
    }

    static async runGuestsLimitTest(page, screenshots, longRun)
    {
        await SecurityApi.updateSettings(BaseE2eTest.gameConfig, {guestsMaxPerIp: 1});
        await TestLoginSecurity.submitGuestLogin(page, longRun);
        await page.waitForSelector(
            Selectors.characterSelect.newPlayerName,
            { state: 'visible', timeout: TimeConstants.forLongRun(TimeConstants.CHARACTER_SCREEN, longRun) }
        );
        await screenshots.capture(page, 'first-guest-accepted');
        await TestLoginSecurity.submitGuestLogin(page, longRun);
        await expect(page.locator(Selectors.guest.error)).not.toBeEmpty(
            { timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun) }
        );
        await screenshots.capture(page, 'second-guest-rejected');
    }

    static async runJoinsThrottleTest(page, screenshots, gameConfig, longRun)
    {
        let username = gameConfig.e2eUsername || 'root';
        let password = gameConfig.e2ePassword || 'root';
        await SecurityApi.updateSettings(gameConfig, {gameLoginMaxJoins: 2});
        await Login.loginToSelection(page, username, password, longRun);
        await Login.loginToSelection(page, username, password, longRun);
        await Login.submitLoginExpectingError(page, username, password, longRun);
        await screenshots.capture(page, 'third-join-rejected');
    }

    static async denyLocalAddresses(gameConfig)
    {
        let denyResult = await SecurityApi.denyAddresses(
            gameConfig,
            TestLoginSecurity.LOCAL_ADDRESSES,
            TestLoginSecurity.DENY_DURATION_MS
        );
        expect(denyResult.ok).toBeTruthy();
    }

    static async waitForDenyListLifted(page)
    {
        await page.waitForTimeout(TestLoginSecurity.DENY_DURATION_MS + 1000);
    }

    static async runDeniedAddressPageTest(page, screenshots, gameConfig)
    {
        await TestLoginSecurity.denyLocalAddresses(gameConfig);
        let deniedResponse = await page.goto('/');
        expect(deniedResponse.status()).toBe(403);
        await screenshots.capture(page, 'denied-address-page');
        await TestLoginSecurity.waitForDenyListLifted(page);
        let allowedResponse = await page.goto('/');
        expect(allowedResponse.status()).toBe(200);
    }

    static async runDeniedAddressJoinTest(page, screenshots, gameConfig, longRun)
    {
        let username = gameConfig.e2eUsername || 'root';
        let password = gameConfig.e2ePassword || 'root';
        await page.goto('/');
        await page.waitForSelector(
            Selectors.login.form,
            { state: 'visible', timeout: TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, longRun) }
        );
        await TestLoginSecurity.denyLocalAddresses(gameConfig);
        await page.locator(Selectors.login.username).fill(username);
        await page.locator(Selectors.login.password).fill(password);
        await page.click(Selectors.login.submit);
        await expect(page.locator(Selectors.login.error)).not.toBeEmpty(
            { timeout: TestLoginSecurity.DENY_DURATION_MS }
        );
        await expect(page.locator(Selectors.characterSelect.container+':not(.hidden)')).toHaveCount(0);
        await screenshots.capture(page, 'denied-address-join');
        await TestLoginSecurity.waitForDenyListLifted(page);
    }

    static async submitForgotPassword(page, email, longRun)
    {
        await page.goto('/');
        await expect(page.locator(Selectors.forgot.form)).toBeVisible(
            { timeout: TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, longRun) }
        );
        await page.locator(Selectors.forgot.email).fill(email);
        await page.click(Selectors.forgot.submit);
        let errorLocator = page.locator(Selectors.forgot.error);
        await expect(errorLocator).not.toBeEmpty(
            { timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun) }
        );
        return (await errorLocator.textContent()).trim();
    }

    static async runForgotPasswordTest(page, screenshots, gameConfig, longRun)
    {
        let username = gameConfig.e2eUsername || 'root';
        let sentTime = await SecurityApi.markResetSent(gameConfig, username);
        expect(sentTime).toBeGreaterThan(0);
        let knownEmailMessage = await TestLoginSecurity.submitForgotPassword(page, username+'@yourgame.com', longRun);
        await screenshots.capture(page, 'forgot-known-email');
        let unknownEmailMessage = await TestLoginSecurity.submitForgotPassword(
            page,
            'e2e-unknown-'+Date.now()+'@yourgame.com',
            longRun
        );
        await screenshots.capture(page, 'forgot-unknown-email');
        expect(knownEmailMessage).toBe(unknownEmailMessage);
        let lastSentTime = await SecurityApi.fetchResetSentTime(gameConfig, username);
        expect(lastSentTime, 'No email sent in the interval').toBe(sentTime);
    }

    static run()
    {
        test.describe('Login Security', () => {
            test(
                'unknown username and wrong password show the same error',
                async ({ page, screenshots, gameConfig, longRun }) => {
                    await TestLoginSecurity.runUniformErrorTest(page, screenshots, gameConfig, longRun);
                }
            );
            test(
                'repeated wrong passwords block the login and the stored block survives a restart',
                async ({ page, screenshots, gameConfig, longRun }) => {
                    await TestLoginSecurity.runLockoutTest(page, screenshots, gameConfig, longRun);
                }
            );
            test('banned account can not log in', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestLoginSecurity.runBannedAccountTest(page, screenshots, gameConfig, longRun);
            });
            test('registration limit per address blocks the next account', async ({ page, screenshots, longRun }) => {
                await TestLoginSecurity.runRegistrationLimitTest(page, screenshots, longRun);
            });
            test('guests limit per address blocks the next guest', async ({ page, screenshots, longRun }) => {
                await TestLoginSecurity.runGuestsLimitTest(page, screenshots, longRun);
            });
            test(
                'game joins throttle blocks the next login from the same address',
                async ({ page, screenshots, gameConfig, longRun }) => {
                    await TestLoginSecurity.runJoinsThrottleTest(page, screenshots, gameConfig, longRun);
                }
            );
            test('denied address can not load the game', async ({ page, screenshots, gameConfig }) => {
                await TestLoginSecurity.runDeniedAddressPageTest(page, screenshots, gameConfig);
            });
            test(
                'denied address can not join the game room from an open page',
                async ({ page, screenshots, gameConfig, longRun }) => {
                    await TestLoginSecurity.runDeniedAddressJoinTest(page, screenshots, gameConfig, longRun);
                }
            );
            test(
                'forgot password answers the same and sends nothing inside the interval',
                async ({ page, screenshots, gameConfig, longRun }) => {
                    await TestLoginSecurity.runForgotPasswordTest(page, screenshots, gameConfig, longRun);
                }
            );
        });
    }

}

TestLoginSecurity.run();
