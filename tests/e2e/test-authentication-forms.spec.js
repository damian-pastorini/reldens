/**
 *
 * Reldens - Test Authentication Forms
 *
 * Tests the client behaviour of the login, registration and guest forms: a wrong password followed by the correct one
 * on the same page, the double submit, the empty required fields, the registration errors shown before anything is
 * sent, the terms and conditions box and the loading spinner and body classes of a failed login. The join requests are
 * counted from the browser matchmake requests, so a form that must send nothing is proved to send nothing.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { Navigation } = require('./helpers/navigation');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAuthenticationForms
{

    static MATCHMAKE_PATH = '/matchmake/';
    static LOADING_SELECTOR = '#login-form .loading-container';
    static NOTHING_SENT_WAIT_MS = 1000;
    static DELAYED_JOIN_MS = 800;
    static TERMS_ERROR = 'Please read and accept the terms and conditions and continue.';
    static MISMATCH_ERROR = 'Password and confirmation does not match.';

    static trackJoinRequests(page)
    {
        let joinRequests = [];
        page.on('request', (request) => {
            if(-1 !== request.url().indexOf(TestAuthenticationForms.MATCHMAKE_PATH)){
                joinRequests.push(request.url());
            }
        });
        return joinRequests;
    }

    static async expectNothingSent(page, joinRequests, label)
    {
        await page.waitForTimeout(TestAuthenticationForms.NOTHING_SENT_WAIT_MS);
        expect(joinRequests, label).toEqual([]);
    }

    static async fillRegistration(page, password, rePassword)
    {
        let uniqueKey = 'e2eform'+Date.now();
        await page.locator(Selectors.register.username).fill(uniqueKey);
        await page.locator(Selectors.register.email).fill(uniqueKey+'@yourgame.com');
        await page.locator(Selectors.register.password).fill(password);
        await page.locator(Selectors.register.rePassword).fill(rePassword);
        return uniqueKey;
    }

    static async acceptTerms(page)
    {
        await page.locator(Selectors.register.termsLink).click();
        await page.locator(Selectors.register.termsCheckbox).check();
        await page.locator(Selectors.register.termsAcceptClose).first().click();
    }

    static async runWrongThenCorrectTest(page, screenshots, gameConfig, longRun)
    {
        await Login.submitLoginExpectingError(page, gameConfig.e2eUsername, 'e2e-wrong-password', longRun);
        await page.locator(Selectors.login.username).focus();
        await expect(page.locator(Selectors.login.error), 'The focus must clear the error').toBeEmpty();
        await page.locator(Selectors.login.password).fill(gameConfig.e2ePassword);
        await page.click(Selectors.login.submit);
        await expect(page.locator(Selectors.characterSelect.container)).toBeVisible({
            timeout: TimeConstants.forLongRun(TimeConstants.CHARACTER_SCREEN, longRun)
        });
        await screenshots.capture(page, 'wrong-then-correct-password');
    }

    static async runDoubleLoginSubmitTest(page, screenshots, gameConfig, longRun)
    {
        let joinRequests = TestAuthenticationForms.trackJoinRequests(page);
        expect(await Navigation.openPageAndWaitForNetworkIdle(page, '/'), 'Page requests must finish').toEqual([]);
        await page.locator(Selectors.login.username).fill(gameConfig.e2eUsername);
        await page.locator(Selectors.login.password).fill(gameConfig.e2ePassword);
        await page.locator(Selectors.login.form).evaluate((form) => {
            form.requestSubmit();
            form.requestSubmit();
        });
        await expect(page.locator(Selectors.characterSelect.container)).toBeVisible({
            timeout: TimeConstants.forLongRun(TimeConstants.CHARACTER_SCREEN, longRun)
        });
        expect(joinRequests.length, 'A double submit must send one join').toBe(1);
        await screenshots.capture(page, 'double-login-submit');
    }

    static async runDoubleRegistrationSubmitTest(page, screenshots, gameConfig, longRun)
    {
        expect(await Navigation.openPageAndWaitForNetworkIdle(page, '/'), 'Page requests must finish').toEqual([]);
        let username = await TestAuthenticationForms.fillRegistration(page, 'E2ePassword1', 'E2ePassword1');
        await TestAuthenticationForms.acceptTerms(page);
        await page.locator(Selectors.register.form).evaluate((form) => {
            form.requestSubmit();
            form.requestSubmit();
        });
        await expect(page.locator(Selectors.characterSelect.container)).toBeVisible({
            timeout: TimeConstants.forLongRun(TimeConstants.CHARACTER_SCREEN, longRun)
        });
        expect(
            (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'users', {username})).length,
            'A double submit must create one account'
        ).toBe(1);
        await screenshots.capture(page, 'double-registration-submit');
    }

    static async runEmptyFieldsTest(page, screenshots)
    {
        let joinRequests = TestAuthenticationForms.trackJoinRequests(page);
        expect(await Navigation.openPageAndWaitForNetworkIdle(page, '/'), 'Page requests must finish').toEqual([]);
        for(let submitSelector of [Selectors.login.submit, Selectors.register.submit]){
            await page.click(submitSelector);
            await TestAuthenticationForms.expectNothingSent(page, joinRequests, submitSelector+' with empty fields');
        }
        await screenshots.capture(page, 'empty-required-fields');
    }

    static async runShortPasswordTest(page, screenshots, gameConfig)
    {
        let minimumLength = Number(
            await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, 'client/players/password/minimumLength')
        );
        let joinRequests = TestAuthenticationForms.trackJoinRequests(page);
        expect(await Navigation.openPageAndWaitForNetworkIdle(page, '/'), 'Page requests must finish').toEqual([]);
        let shortPassword = 'x'.repeat(minimumLength - 1);
        await TestAuthenticationForms.fillRegistration(page, shortPassword, shortPassword);
        await page.click(Selectors.register.submit);
        await expect(page.locator(Selectors.registerResponse.error)).toHaveText(
            'The password must have at least '+minimumLength+' characters.'
        );
        await TestAuthenticationForms.expectNothingSent(page, joinRequests, 'Password below the minimum');
        await screenshots.capture(page, 'short-password-error');
    }

    static async runMismatchTest(page, screenshots)
    {
        let joinRequests = TestAuthenticationForms.trackJoinRequests(page);
        expect(await Navigation.openPageAndWaitForNetworkIdle(page, '/'), 'Page requests must finish').toEqual([]);
        await TestAuthenticationForms.fillRegistration(page, 'E2ePassword1', 'E2ePassword2');
        await page.click(Selectors.register.submit);
        await expect(page.locator(Selectors.registerResponse.error)).toHaveText(TestAuthenticationForms.MISMATCH_ERROR);
        await TestAuthenticationForms.expectNothingSent(page, joinRequests, 'Mismatched confirmation');
        await screenshots.capture(page, 'password-mismatch-error');
    }

    static async runTermsTest(page, screenshots)
    {
        let joinRequests = TestAuthenticationForms.trackJoinRequests(page);
        expect(await Navigation.openPageAndWaitForNetworkIdle(page, '/'), 'Page requests must finish').toEqual([]);
        await TestAuthenticationForms.fillRegistration(page, 'E2ePassword1', 'E2ePassword1');
        await page.locator(Selectors.register.termsLink).click();
        await expect(page.locator(Selectors.register.termsBox)).toBeVisible();
        await page.locator(Selectors.register.termsAcceptClose).first().click();
        await expect(page.locator(Selectors.register.termsBox), 'Close must hide the box').toBeHidden();
        await page.click(Selectors.register.submit);
        await expect(page.locator(Selectors.registerResponse.error)).toHaveText(TestAuthenticationForms.TERMS_ERROR);
        await TestAuthenticationForms.expectNothingSent(page, joinRequests, 'Terms not accepted');
        await screenshots.capture(page, 'terms-not-accepted-error');
        await page.locator(Selectors.register.termsLink).click();
        await page.locator(Selectors.register.termsCheckbox).check();
        await expect(page.locator(Selectors.registerResponse.error), 'Accepting must clear the error').toBeEmpty();
    }

    static async runTermsLanguageTest(page, screenshots)
    {
        let termsRequest = page.waitForRequest(request => -1 !== request.url().indexOf('terms-and-conditions?lang=es'));
        await page.goto('/?lang=es');
        await termsRequest;
        await screenshots.capture(page, 'terms-requested-with-language');
    }

    static async runFailedLoginStateTest(page, screenshots, gameConfig, longRun)
    {
        await page.route('**'+TestAuthenticationForms.MATCHMAKE_PATH+'**', async (route) => {
            await page.waitForTimeout(TestAuthenticationForms.DELAYED_JOIN_MS);
            await route.continue();
        });
        await Login.submitLogin(page, gameConfig.e2eUsername, 'e2e-wrong-password', longRun);
        await expect(page.locator(TestAuthenticationForms.LOADING_SELECTOR), 'The spinner must show while waiting').toBeVisible();
        await expect(page.locator(Selectors.login.error)).not.toBeEmpty({
            timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun)
        });
        await expect(page.locator(TestAuthenticationForms.LOADING_SELECTOR), 'The error must hide the spinner').toBeHidden();
        await expect(page.locator('body')).toHaveClass(/game-error/);
        await expect(page.locator('body')).not.toHaveClass(/game-started/);
        await screenshots.capture(page, 'failed-login-state');
    }

    static run()
    {
        test.describe('Authentication Forms', () => {
            test('wrong password then the correct one works on the same page', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAuthenticationForms.runWrongThenCorrectTest(page, screenshots, gameConfig, longRun);
            });
            test('double submit of the login form sends one join', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAuthenticationForms.runDoubleLoginSubmitTest(page, screenshots, gameConfig, longRun);
            });
            test('double submit of the registration form creates one account', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAuthenticationForms.runDoubleRegistrationSubmitTest(page, screenshots, gameConfig, longRun);
            });
            test('empty required fields block the submit', async ({ page, screenshots }) => {
                await TestAuthenticationForms.runEmptyFieldsTest(page, screenshots);
            });
            test('registration password below the minimum shows the error', async ({ page, screenshots, gameConfig }) => {
                await TestAuthenticationForms.runShortPasswordTest(page, screenshots, gameConfig);
            });
            test('registration with a mismatched confirmation shows the error', async ({ page, screenshots }) => {
                await TestAuthenticationForms.runMismatchTest(page, screenshots);
            });
            test('terms box closes without accepting and the checkbox clears the error', async ({ page, screenshots }) => {
                await TestAuthenticationForms.runTermsTest(page, screenshots);
            });
            test('terms text is requested with the page language', async ({ page, screenshots }) => {
                await TestAuthenticationForms.runTermsLanguageTest(page, screenshots);
            });
            test('failed login shows the spinner and sets the error class', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAuthenticationForms.runFailedLoginStateTest(page, screenshots, gameConfig, longRun);
            });
        });
    }

}

TestAuthenticationForms.run();
