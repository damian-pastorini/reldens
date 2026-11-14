/**
 *
 * Reldens - Test Password Reset
 *
 * Tests the reset password link: the link sent by email opens the form and changes the password once, the invalid,
 * expired, forged and incomplete links show the error, the password rules and their exact limits, two submits of one
 * link, a link made invalid by another password change, and the reset ending a game session and an admin session.
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { BaseE2eTest } = require('./base-e2e-test');
const { GameRoomJoin } = require('./helpers/game-room-join');
const { DirectFormSubmit } = require('./helpers/direct-form-submit');
const { AdminPanelSession } = require('./helpers/admin-panel-session');
const { Login } = require('./helpers/login');
const { MovementScenario } = require('./helpers/movement-scenario');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { SecurityApi } = require('./helpers/security-api');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { GameConst } = require('../../lib/game/constants');
const GameTranslations = require('../../lib/game/client/snippets/en_US');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestPasswordReset
{

    static RESET_FORM = '.reset-password-form';
    static FORM_TITLE = '.form-title';
    static RESET_SUCCESS_TITLE = 'Your password has been reset!';
    static RESET_ERROR_TITLE = 'Reset password error!';
    static EXISTS_MESSAGE = 'If the email exists then a reset password link should be received soon.';
    static TOKEN_LIFETIME_MS = 600000;
    static NEW_PASSWORD = 'E2eResetPassword1';
    static HTML_EMAIL_PAYLOAD_PATH = FileHandler.joinPaths(process.cwd(), 'tests', 'e2e', 'assets', 'html-email-payload.txt');

    static async createToken(gameConfig, email, expiresAt)
    {
        return (await SecurityApi.request(gameConfig, 'POST', '/api/e2e/password-reset/token', {email, expiresAt})).token;
    }

    static createResetUrl(gameConfig, email, token)
    {
        return SecurityApi.baseUrl(gameConfig)+GameConst.ROUTE_PATHS.RESET_PASSWORD
            +'?email='+encodeURIComponent(email)+'&token='+encodeURIComponent(token);
    }

    static async postReset(page, email, token, password, rePassword)
    {
        return await (await page.request.post(GameConst.ROUTE_PATHS.RESET_PASSWORD, {
            form: {email, token, password, 're-password': rePassword}
        })).text();
    }

    static async submitResetForm(page, password)
    {
        await page.locator(TestPasswordReset.RESET_FORM+' [name="password"]').fill(password);
        await page.locator(TestPasswordReset.RESET_FORM+' [name="re-password"]').fill(password);
        await page.click(TestPasswordReset.RESET_FORM+' [type="submit"]');
    }

    static async runEmailLinkTest(page, screenshots, gameConfig)
    {
        await SecurityApi.setMailerEnabled(gameConfig, true);
        let account = await GameRoomJoin.createRegisteredAccount(gameConfig, 'a');
        expect(await GameRoomJoin.join(gameConfig, {forgot: true, email: account.email})).toEqual({
            joined: false,
            error: TestPasswordReset.EXISTS_MESSAGE
        });
        let sentEmails = (await SecurityApi.fetchSentEmails(gameConfig)).filter(sentEmail => account.email === sentEmail.to);
        expect(sentEmails.length, 'One email').toBe(1);
        await page.setContent(sentEmails.shift().html);
        let resetLink = await page.locator('a').getAttribute('href');
        expect(resetLink.startsWith(SecurityApi.baseUrl(gameConfig)+GameConst.ROUTE_PATHS.RESET_PASSWORD+'?'), resetLink).toBe(true);
        await page.goto(resetLink);
        await expect(page.locator(TestPasswordReset.RESET_FORM)).toBeVisible();
        await TestPasswordReset.submitResetForm(page, TestPasswordReset.NEW_PASSWORD);
        await expect(page.locator(TestPasswordReset.FORM_TITLE)).toHaveText(TestPasswordReset.RESET_SUCCESS_TITLE);
        await screenshots.capture(page, 'password-reset-success');
        expect(await GameRoomJoin.login(gameConfig, account.username, DirectFormSubmit.VALID_PASSWORD), 'Old').toEqual(
            GameRoomJoin.REJECTED
        );
        expect(await GameRoomJoin.login(gameConfig, account.username, TestPasswordReset.NEW_PASSWORD), 'New').toEqual(
            GameRoomJoin.ACCEPTED
        );
        await page.goto(resetLink);
        await expect(page.locator(TestPasswordReset.FORM_TITLE), 'Used link').toHaveText(TestPasswordReset.RESET_ERROR_TITLE);
    }

    static async runInvalidLinksTest(page, gameConfig)
    {
        let account = await GameRoomJoin.createRegisteredAccount(gameConfig, 'b');
        let otherAccount = await GameRoomJoin.createRegisteredAccount(gameConfig, 'c');
        let expiresAt = Date.now() + TestPasswordReset.TOKEN_LIFETIME_MS;
        let validToken = await TestPasswordReset.createToken(gameConfig, account.email, expiresAt);
        let expiredToken = await TestPasswordReset.createToken(gameConfig, account.email, Date.now() - TestPasswordReset.TOKEN_LIFETIME_MS);
        let resetPath = SecurityApi.baseUrl(gameConfig)+GameConst.ROUTE_PATHS.RESET_PASSWORD;
        let invalidUrls = [
            TestPasswordReset.createResetUrl(gameConfig, account.email, validToken.slice(0, -1)+'x'),
            TestPasswordReset.createResetUrl(gameConfig, account.email, expiredToken),
            TestPasswordReset.createResetUrl(gameConfig, 'e2e-unknown-'+Date.now()+'@yourgame.com', validToken),
            TestPasswordReset.createResetUrl(gameConfig, account.email, validToken.replace(String(expiresAt), String(expiresAt + 1))),
            TestPasswordReset.createResetUrl(gameConfig, otherAccount.email, validToken),
            resetPath+'?email='+encodeURIComponent(account.email),
            resetPath+'?token='+encodeURIComponent(validToken),
            resetPath
        ];
        for(let invalidUrl of invalidUrls){
            await page.goto(invalidUrl);
                await expect(page.locator(TestPasswordReset.FORM_TITLE), invalidUrl).toHaveText(TestPasswordReset.RESET_ERROR_TITLE);
        }
        expect(await TestPasswordReset.postReset(page, '', '', '', ''), 'No fields').toContain(TestPasswordReset.RESET_ERROR_TITLE);
        await page.goto(TestPasswordReset.createResetUrl(gameConfig, account.email, validToken));
        await expect(page.locator(TestPasswordReset.RESET_FORM), 'The valid link still works').toBeVisible();
    }

    static async runPasswordRulesTest(page, gameConfig)
    {
        let minimumLength = Number(await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, 'client/players/password/minimumLength'));
        let maximumLength = Number(await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, 'server/security/passwordMaximumLength'));
        let account = await GameRoomJoin.createRegisteredAccount(gameConfig, 'd');
        let token = await TestPasswordReset.createToken(gameConfig, account.email, Date.now() + TestPasswordReset.TOKEN_LIFETIME_MS);
        let rejectedPasswords = [
            ['x'.repeat(minimumLength), 'y'.repeat(minimumLength)],
            ['a'.repeat(minimumLength - 1), 'a'.repeat(minimumLength - 1)],
            ['a'.repeat(maximumLength + 1), 'a'.repeat(maximumLength + 1)]
        ];
        for(let rejectedPassword of rejectedPasswords){
            expect(await TestPasswordReset.postReset(page, account.email, token, ...rejectedPassword), rejectedPassword.join()).toContain(
                TestPasswordReset.RESET_ERROR_TITLE
            );
        }
        let minimumPassword = 'b'.repeat(minimumLength);
        expect(await TestPasswordReset.postReset(page, account.email, token, minimumPassword, minimumPassword)).toContain(
            TestPasswordReset.RESET_SUCCESS_TITLE
        );
        let nextToken = await TestPasswordReset.createToken(gameConfig, account.email, Date.now() + TestPasswordReset.TOKEN_LIFETIME_MS);
        let maximumPassword = 'c'.repeat(maximumLength);
        expect(await TestPasswordReset.postReset(page, account.email, nextToken, maximumPassword, maximumPassword)).toContain(
            TestPasswordReset.RESET_SUCCESS_TITLE
        );
        expect(await GameRoomJoin.login(gameConfig, account.username, maximumPassword)).toEqual(GameRoomJoin.ACCEPTED);
    }

    static async runConcurrentSubmitsTest(page, gameConfig)
    {
        let account = await GameRoomJoin.createRegisteredAccount(gameConfig, 'e');
        let token = await TestPasswordReset.createToken(gameConfig, account.email, Date.now() + TestPasswordReset.TOKEN_LIFETIME_MS);
        let passwords = [TestPasswordReset.NEW_PASSWORD+'A', TestPasswordReset.NEW_PASSWORD+'B'];
        let resultTexts = await Promise.all(passwords.map(
            password => TestPasswordReset.postReset(page, account.email, token, password, password)
        ));
        let successPasswords = passwords.filter(
            (password, index) => resultTexts[index].includes(TestPasswordReset.RESET_SUCCESS_TITLE)
        );
        expect(successPasswords.length, 'Only one submit').toBe(1);
        expect(await GameRoomJoin.login(gameConfig, account.username, successPasswords.shift())).toEqual(GameRoomJoin.ACCEPTED);
    }

    static async runChangedAnotherWayTest(page, gameConfig, e2eGroup)
    {
        let account = await GameRoomJoin.createRegisteredAccount(gameConfig, 'f');
        let token = await TestPasswordReset.createToken(gameConfig, account.email, Date.now() + TestPasswordReset.TOKEN_LIFETIME_MS);
        await E2eSeedAndRestoreApi.updateWithPreserve(gameConfig, e2eGroup, 'users', {email: account.email}, {
            password: 'e2e-changed-password-hash'
        });
        await page.goto(TestPasswordReset.createResetUrl(gameConfig, account.email, token));
        await expect(page.locator(TestPasswordReset.FORM_TITLE)).toHaveText(TestPasswordReset.RESET_ERROR_TITLE);
    }

    static async runHtmlEmailTest(page, gameConfig)
    {
        let payloadEmail = FileHandler.readFile(TestPasswordReset.HTML_EMAIL_PAYLOAD_PATH).trim()+'@yourgame.com';
        expect(await GameRoomJoin.register(gameConfig, GameRoomJoin.createAccount('g', payloadEmail)), payloadEmail).toEqual(
            GameRoomJoin.ACCEPTED
        );
        let token = await TestPasswordReset.createToken(gameConfig, payloadEmail, Date.now() + TestPasswordReset.TOKEN_LIFETIME_MS);
        await page.goto(TestPasswordReset.createResetUrl(gameConfig, payloadEmail, token));
        await expect(page.locator(TestPasswordReset.RESET_FORM+' [name="email"]'), 'Escaped value').toHaveValue(payloadEmail);
        await page.locator(TestPasswordReset.RESET_FORM+' [name="password"]').fill(TestPasswordReset.NEW_PASSWORD);
        await page.locator(TestPasswordReset.RESET_FORM+' [name="re-password"]').fill(TestPasswordReset.NEW_PASSWORD+'x');
        await page.click(TestPasswordReset.RESET_FORM+' [type="submit"]');
        await expect(page.locator(TestPasswordReset.FORM_TITLE)).toHaveText(TestPasswordReset.RESET_ERROR_TITLE);
        await expect(page.locator('img[src="x"]'), 'No element created').toHaveCount(0);
        expect(await page.evaluate(() => Boolean(window.e2eStoredScriptRan)), 'No script ran').toBe(false);
    }

    static async resetRootPassword(page, gameConfig, e2eGroup)
    {
        await E2eSeedAndRestoreApi.preserveRows(gameConfig, e2eGroup, 'users', {username: gameConfig.e2eUsername});
        let rootUser = (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'users', {username: gameConfig.e2eUsername})).shift();
        let token = await TestPasswordReset.createToken(gameConfig, rootUser.email, Date.now() + TestPasswordReset.TOKEN_LIFETIME_MS);
        expect(await TestPasswordReset.postReset(
            page,
            rootUser.email,
            token,
            TestPasswordReset.NEW_PASSWORD,
            TestPasswordReset.NEW_PASSWORD
        )).toContain(TestPasswordReset.RESET_SUCCESS_TITLE);
    }

    static async runResetDuringGameTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        await Login.loginRootPlayer(page, gameConfig, longRun);
        await MovementScenario.walkBelowTheForestFromReturnPoint(page, gameConfig, gameConfig.e2ePlayerName, longRun);
        await TestPasswordReset.resetRootPassword(page, gameConfig, e2eGroup);
        await MovementScenario.tryWalkIntoTheForest(page, longRun);
        await expect(page.locator(Selectors.reloadModal.message)).toHaveText(GameTranslations.game.errors.reconnectClient, {
            timeout: TimeConstants.forLongRun(TimeConstants.GAME_START, longRun)
        });
        await screenshots.capture(page, 'reset-during-game');
    }

    static async runResetEndsAdminSessionTest(page, gameConfig, e2eGroup, longRun)
    {
        await AdminPanelSession.loginAsAdmin(page, gameConfig, longRun);
        await TestPasswordReset.resetRootPassword(page, gameConfig, e2eGroup);
        await AdminPanelSession.expectLoggedOut(page, longRun);
    }

    static run()
    {
        test.describe('Password Reset', () => {
            test('email link opens the form, changes the password once and is rejected after', async ({ page, screenshots, gameConfig }) => {
                await TestPasswordReset.runEmailLinkTest(page, screenshots, gameConfig);
            });
            test('invalid, expired, forged and incomplete links show the error', async ({ page, gameConfig }) => {
                await TestPasswordReset.runInvalidLinksTest(page, gameConfig);
            });
            test('password confirmation and length rules apply with their exact limits accepted', async ({ page, gameConfig }) => {
                await TestPasswordReset.runPasswordRulesTest(page, gameConfig);
            });
            test('two submits of one link change the password once', async ({ page, gameConfig }) => {
                await TestPasswordReset.runConcurrentSubmitsTest(page, gameConfig);
            });
            test('link is rejected after the password changed another way', async ({ page, gameConfig, e2eGroup }) => {
                await TestPasswordReset.runChangedAnotherWayTest(page, gameConfig, e2eGroup);
            });
            test('HTML in the email is escaped on the reset pages', async ({ page, gameConfig }) => {
                await TestPasswordReset.runHtmlEmailTest(page, gameConfig);
            });
            test('reset during a game session rejects its next scene change', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestPasswordReset.runResetDuringGameTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('reset ends the administration session', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestPasswordReset.runResetEndsAdminSessionTest(page, gameConfig, e2eGroup, longRun);
            });
        });
    }

}

TestPasswordReset.run();
