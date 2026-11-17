/**
 *
 * Reldens - Test Forgot Password
 *
 * Tests the forgot password requests: the mailer disabled while the form is open, the requests limit per address, the
 * reset email interval and its exact start, the send failure and the missing signed tokens secret restoring the sent
 * time, two requests at the same time, a banned account and the forged and the invalid emails.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { GameRoomJoin } = require('./helpers/game-room-join');
const { DirectFormSubmit } = require('./helpers/direct-form-submit');
const { PlayerReset } = require('./helpers/player-reset');
const { SecurityApi } = require('./helpers/security-api');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestForgotPassword
{

    static EXISTS_MESSAGE = 'If the email exists then a reset password link should be received soon.';
    static MAILER_DISABLED_MESSAGE = 'The forgot password email can not be send, please contact the administrator.';
    static COMPLETE_EMAIL_MESSAGE = 'Please complete your email.';
    static MATCHMAKE_PATH = '/matchmake/';
    static INSIDE_INTERVAL_MS = 60000;
    static NOTHING_SENT_WAIT_MS = 1000;

    static async requestForgot(gameConfig, email, host = GameRoomJoin.IPV4_HOST)
    {
        return await GameRoomJoin.join(gameConfig, {forgot: true, email}, host);
    }

    static async fetchRecipients(gameConfig)
    {
        return (await SecurityApi.fetchSentEmails(gameConfig)).map(sentEmail => sentEmail.to);
    }

    static async updateResetSettings(gameConfig, settings)
    {
        return await SecurityApi.request(gameConfig, 'POST', '/api/e2e/password-reset/settings', settings);
    }

    static async expectExistsAnswer(gameConfig, email, host, label)
    {
        expect(await TestForgotPassword.requestForgot(gameConfig, email, host), label).toEqual({
            joined: false,
            error: TestForgotPassword.EXISTS_MESSAGE
        });
    }

    static async runMailerDisabledOpenFormTest(page, screenshots, gameConfig, longRun)
    {
        let account = await GameRoomJoin.createRegisteredAccount(gameConfig, 'a');
        await SecurityApi.setMailerEnabled(gameConfig, true);
        await DirectFormSubmit.openPage(page);
        await expect(page.locator(Selectors.forgot.form)).toBeVisible();
        await SecurityApi.setMailerEnabled(gameConfig, false);
        await page.locator(Selectors.forgot.email).fill(account.email);
        await page.click(Selectors.forgot.submit);
        await expect(page.locator(Selectors.forgot.error)).toHaveText(TestForgotPassword.MAILER_DISABLED_MESSAGE, {
            timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun)
        });
        await screenshots.capture(page, 'forgot-mailer-disabled-open-form');
    }

    static async runAddressLimitTest(gameConfig)
    {
        let firstAccount = await GameRoomJoin.createRegisteredAccount(gameConfig, 'b');
        let secondAccount = await GameRoomJoin.createRegisteredAccount(gameConfig, 'c');
        await SecurityApi.setMailerEnabled(gameConfig, true);
        await TestForgotPassword.updateResetSettings(gameConfig, {requestsMaxPerIp: 1});
        await TestForgotPassword.expectExistsAnswer(gameConfig, firstAccount.email, GameRoomJoin.IPV4_HOST, 'First');
        await TestForgotPassword.expectExistsAnswer(gameConfig, secondAccount.email, GameRoomJoin.IPV4_HOST, 'Limited');
        expect(await TestForgotPassword.fetchRecipients(gameConfig), 'Limited sends nothing').toEqual([firstAccount.email]);
        await TestForgotPassword.expectExistsAnswer(gameConfig, secondAccount.email, GameRoomJoin.IPV6_HOST, 'Other address');
        expect(await TestForgotPassword.fetchRecipients(gameConfig)).toEqual([firstAccount.email, secondAccount.email]);
    }

    static async setResetSentAt(gameConfig, email, sentAt)
    {
        await SecurityApi.request(gameConfig, 'POST', '/api/e2e/password-reset/sent-at', {email, sentAt});
    }

    static async runIntervalTest(gameConfig)
    {
        await SecurityApi.setMailerEnabled(gameConfig, true);
        let intervalMs = (await TestForgotPassword.updateResetSettings(gameConfig, {})).forgotPasswordIntervalMs;
        let endedAccount = await GameRoomJoin.createRegisteredAccount(gameConfig, 'd');
        let startAccount = await GameRoomJoin.createRegisteredAccount(gameConfig, 'e');
        let insideAccount = await GameRoomJoin.createRegisteredAccount(gameConfig, 'f');
        let now = Date.now();
        await TestForgotPassword.setResetSentAt(gameConfig, endedAccount.email, now - intervalMs - TestForgotPassword.INSIDE_INTERVAL_MS);
        await TestForgotPassword.setResetSentAt(gameConfig, startAccount.email, now - intervalMs);
        await TestForgotPassword.setResetSentAt(gameConfig, insideAccount.email, now - intervalMs + TestForgotPassword.INSIDE_INTERVAL_MS);
        for(let account of [endedAccount, startAccount, insideAccount]){
            await TestForgotPassword.expectExistsAnswer(gameConfig, account.email, GameRoomJoin.IPV4_HOST, account.username);
        }
        expect(await TestForgotPassword.fetchRecipients(gameConfig), 'Only out of the interval').toEqual([
            endedAccount.email,
            startAccount.email
        ]);
    }

    static async runSendFailureTest(gameConfig)
    {
        let account = await GameRoomJoin.createRegisteredAccount(gameConfig, 'g');
        await SecurityApi.setMailerEnabled(gameConfig, true);
        await TestForgotPassword.updateResetSettings(gameConfig, {failingSends: 1});
        await TestForgotPassword.expectExistsAnswer(gameConfig, account.email, GameRoomJoin.IPV4_HOST, 'Failed send');
        expect(await TestForgotPassword.fetchRecipients(gameConfig), 'Nothing sent').toEqual([]);
        expect(await SecurityApi.fetchResetSentTime(gameConfig, account.username), 'Sent time restored').toBe(0);
        await TestForgotPassword.expectExistsAnswer(gameConfig, account.email, GameRoomJoin.IPV4_HOST, 'Retry');
        expect(await TestForgotPassword.fetchRecipients(gameConfig), 'The retry sends').toEqual([account.email]);
        expect(await SecurityApi.fetchResetSentTime(gameConfig, account.username)).toBeGreaterThan(0);
    }

    static async runMissingSecretTest(gameConfig)
    {
        let account = await GameRoomJoin.createRegisteredAccount(gameConfig, 'h');
        await SecurityApi.setMailerEnabled(gameConfig, true);
        await TestForgotPassword.updateResetSettings(gameConfig, {removeSecret: true});
        await TestForgotPassword.expectExistsAnswer(gameConfig, account.email, GameRoomJoin.IPV4_HOST, 'No secret');
        expect(await TestForgotPassword.fetchRecipients(gameConfig), 'Nothing sent').toEqual([]);
        expect(await SecurityApi.fetchResetSentTime(gameConfig, account.username), 'Sent time restored').toBe(0);
    }

    static async runConcurrentRequestsTest(gameConfig)
    {
        let account = await GameRoomJoin.createRegisteredAccount(gameConfig, 'i');
        await SecurityApi.setMailerEnabled(gameConfig, true);
        let forgotResults = await Promise.all([1, 2].map(() => TestForgotPassword.requestForgot(gameConfig, account.email)));
        expect(forgotResults.map(forgotResult => forgotResult.error)).toEqual([
            TestForgotPassword.EXISTS_MESSAGE,
            TestForgotPassword.EXISTS_MESSAGE
        ]);
        expect(await TestForgotPassword.fetchRecipients(gameConfig), 'One email').toEqual([account.email]);
    }

    static async runBannedAccountTest(gameConfig)
    {
        let account = await GameRoomJoin.createRegisteredAccount(gameConfig, 'j');
        expect((await SecurityApi.banUser(gameConfig, account.username)).ok).toBe(true);
        await SecurityApi.setMailerEnabled(gameConfig, true);
        await TestForgotPassword.expectExistsAnswer(gameConfig, account.email, GameRoomJoin.IPV4_HOST, 'Banned');
        expect(await TestForgotPassword.fetchRecipients(gameConfig), 'The banned account gets the link').toEqual([account.email]);
        expect(await GameRoomJoin.login(gameConfig, account.username, DirectFormSubmit.VALID_PASSWORD), 'Still banned').toEqual(
            GameRoomJoin.REJECTED
        );
    }

    static async runForgedRequestsTest(gameConfig)
    {
        await SecurityApi.setMailerEnabled(gameConfig, true);
        for(let forgedRequest of [{forgot: true, email: ''}, {forgot: true, email: 12345}, {forgot: true}]){
                expect(await GameRoomJoin.join(gameConfig, forgedRequest), String(forgedRequest.email)).toEqual({
                joined: false,
                error: TestForgotPassword.COMPLETE_EMAIL_MESSAGE
            });
        }
        expect(await TestForgotPassword.fetchRecipients(gameConfig)).toEqual([]);
    }

    static async runFormValidationTest(page, gameConfig, longRun)
    {
        let account = await GameRoomJoin.createRegisteredAccount(gameConfig, 'k');
        let requestedUrls = [];
        page.on('request', request => requestedUrls.push(request.url()));
        await SecurityApi.setMailerEnabled(gameConfig, true);
        await DirectFormSubmit.openPage(page);
        await expect(page.locator(Selectors.forgot.form)).toBeVisible();
        let fetchMatchmakeRequests = () => requestedUrls.filter(url => url.includes(TestForgotPassword.MATCHMAKE_PATH));
        for(let invalidEmail of ['', 'not-an-email']){
            await page.locator(Selectors.forgot.email).fill(invalidEmail);
            await page.click(Selectors.forgot.submit);
            await page.waitForTimeout(TestForgotPassword.NOTHING_SENT_WAIT_MS);
                expect(fetchMatchmakeRequests(), 'Nothing sent for "'+invalidEmail+'"').toEqual([]);
        }
        await page.locator(Selectors.forgot.email).fill(account.email);
        await page.click(Selectors.forgot.submit);
        await expect(page.locator(Selectors.forgot.error)).toHaveText(TestForgotPassword.EXISTS_MESSAGE, {
            timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun)
        });
        expect(fetchMatchmakeRequests().length, 'The valid email is sent').toBe(1);
    }

    static run()
    {
        test.describe('Forgot Password', () => {
            test.beforeEach(async ({ gameConfig, e2eGroup }) => {
                await PlayerReset.resetAll(gameConfig, e2eGroup);
            });
            test('mailer disabled with the form already open answers the contact administrator error', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestForgotPassword.runMailerDisabledOpenFormTest(page, screenshots, gameConfig, longRun);
            });
            test('requests over the per address limit send nothing and answer the same', async ({ gameConfig }) => {
                await TestForgotPassword.runAddressLimitTest(gameConfig);
            });
            test('reset email is sent only once the interval ended, its exact start included', async ({ gameConfig }) => {
                await TestForgotPassword.runIntervalTest(gameConfig);
            });
            test('send failure restores the sent time and a retry sends', async ({ gameConfig }) => {
                await TestForgotPassword.runSendFailureTest(gameConfig);
            });
            test('missing signed tokens secret sends nothing and restores the sent time', async ({ gameConfig }) => {
                await TestForgotPassword.runMissingSecretTest(gameConfig);
            });
            test('two requests at the same time send one email', async ({ gameConfig }) => {
                await TestForgotPassword.runConcurrentRequestsTest(gameConfig);
            });
            test('banned account gets the same answer and stays banned', async ({ gameConfig }) => {
                await TestForgotPassword.runBannedAccountTest(gameConfig);
            });
            test('forged requests without a string email answer the complete email error', async ({ gameConfig }) => {
                await TestForgotPassword.runForgedRequestsTest(gameConfig);
            });
            test('forgot form with an empty or invalid email sends no request', async ({ page, gameConfig, longRun }) => {
                await TestForgotPassword.runFormValidationTest(page, gameConfig, longRun);
            });
        });
    }

}

TestForgotPassword.run();
