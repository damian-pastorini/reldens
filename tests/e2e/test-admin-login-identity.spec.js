/**
 *
 * Reldens - Test Admin Login Identity
 *
 * Tests how the administration login identifies the user: the unknown email answers the same as a wrong password, the
 * SQL metacharacters match no account, the long emails share the failures of their truncated identity, the email in
 * upper case logs in the stored user, a correct login clears the failures of that identity, the session cookie changes
 * on the login, a stored session without its revision is rejected and destroyed, and the logout deletes the stored row.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { AdminPanelSession } = require('./helpers/admin-panel-session');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { SecurityApi } = require('./helpers/security-api');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAdminLoginIdentity
{

    static SEEDED_PASSWORD = 'root';
    static WRONG_PASSWORD = 'e2e-wrong-password';
    static ATTEMPTS_LIMIT = 3;
    static IDENTITY_MAX_LENGTH = 255;

    static async runUnknownEmailTest(page, screenshots, gameConfig, longRun)
    {
        let unknownEmailResponse = await AdminPanelSession.postLogin(
            page,
            gameConfig,
            longRun,
            'e2e-unknown-'+Date.now()+'@yourgame.com',
            TestAdminLoginIdentity.WRONG_PASSWORD
        );
        let wrongPasswordResponse = await AdminPanelSession.postLogin(
            page,
            gameConfig,
            longRun,
            gameConfig.adminUser,
            TestAdminLoginIdentity.WRONG_PASSWORD
        );
        expect(unknownEmailResponse.status()).toBe(wrongPasswordResponse.status());
        expect(unknownEmailResponse.headers()['location']).toBe(wrongPasswordResponse.headers()['location']);
        await screenshots.capture(page, 'unknown-email-same-answer');
    }

    static async runSqlMetacharactersTest(page, screenshots, gameConfig, longRun)
    {
        let response = await AdminPanelSession.postLogin(
            page,
            gameConfig,
            longRun,
            "' OR '1'='1' -- @yourgame.com",
            TestAdminLoginIdentity.WRONG_PASSWORD
        );
        expect(response.status()).toBe(302);
        expect(response.headers()['location'], 'No account must match').toContain('login-error=true');
        await screenshots.capture(page, 'sql-metacharacters-rejected');
    }

    static async runLongEmailsTest(page, screenshots, gameConfig, longRun)
    {
        let sharedPrefix = 'e'.repeat(TestAdminLoginIdentity.IDENTITY_MAX_LENGTH);
        for(let emailSuffix of ['-first@yourgame.com', '-second@yourgame.com']){
            await AdminPanelSession.postLogin(
                page,
                gameConfig,
                longRun,
                sharedPrefix+emailSuffix,
                TestAdminLoginIdentity.WRONG_PASSWORD
            );
        }
        expect(
            await SecurityApi.fetchIdentityHits(gameConfig, sharedPrefix),
            'Both emails must count on the truncated identity'
        ).toBe(2);
        await screenshots.capture(page, 'long-emails-truncated-identity');
    }

    static async fetchStoredSession(page, gameConfig)
    {
        return [...await E2eSeedAndRestoreApi.loadRows(
            gameConfig,
            'adminSessions',
            {sid: await AdminPanelSession.fetchSessionId(page)}
        )].shift();
    }

    static async runUpperCaseEmailTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let seededUser = await AdminPanelSession.seedUser(gameConfig, e2eGroup);
        await AdminPanelSession.loginAsAdmin(
            page,
            gameConfig,
            longRun,
            seededUser.email.toUpperCase(),
            TestAdminLoginIdentity.SEEDED_PASSWORD
        );
        let storedSession = await TestAdminLoginIdentity.fetchStoredSession(page, gameConfig);
        expect(sc.toJson(storedSession.data).user.id, 'The session must be for the stored user').toBe(seededUser.id);
        await screenshots.capture(page, 'upper-case-email-logged-in');
    }

    static async runFailuresClearedTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let seededUser = await AdminPanelSession.seedUser(gameConfig, e2eGroup);
        await SecurityApi.updateSettings(gameConfig, {maxAttempts: TestAdminLoginIdentity.ATTEMPTS_LIMIT});
        for(let attempt = 1; TestAdminLoginIdentity.ATTEMPTS_LIMIT > attempt; attempt++){
            await AdminPanelSession.postLogin(page, gameConfig, longRun, seededUser.email, TestAdminLoginIdentity.WRONG_PASSWORD);
        }
        expect(await SecurityApi.fetchIdentityHits(gameConfig, seededUser.email)).toBe(TestAdminLoginIdentity.ATTEMPTS_LIMIT - 1);
        await AdminPanelSession.loginAsAdmin(page, gameConfig, longRun, seededUser.email, TestAdminLoginIdentity.SEEDED_PASSWORD);
        expect(await SecurityApi.fetchIdentityHits(gameConfig, seededUser.email), 'The login must clear the failures').toBe(0);
        await screenshots.capture(page, 'identity-failures-cleared');
    }

    static async runSessionFixationTest(page, screenshots, gameConfig, longRun)
    {
        await AdminPanelSession.openLogin(page, gameConfig, longRun);
        let sessionIdBeforeLogin = await AdminPanelSession.fetchSessionId(page);
        await AdminPanelSession.loginAsAdmin(page, gameConfig, longRun);
        expect(await AdminPanelSession.fetchSessionId(page), 'The login must change the session id').not.toBe(sessionIdBeforeLogin);
        await screenshots.capture(page, 'session-id-changed');
    }

    static async runMissingRevisionTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let seededUser = await AdminPanelSession.seedUser(gameConfig, e2eGroup);
        await AdminPanelSession.loginAsAdmin(page, gameConfig, longRun, seededUser.email, TestAdminLoginIdentity.SEEDED_PASSWORD);
        let sessionId = await AdminPanelSession.fetchSessionId(page);
        let storedSession = await TestAdminLoginIdentity.fetchStoredSession(page, gameConfig);
        let sessionData = sc.toJson(storedSession.data);
        sessionData.user = sc.omitProps(sessionData.user, ['sessionRevision']);
        await E2eSeedAndRestoreApi.updateWithPreserve(gameConfig, e2eGroup, 'adminSessions', {sid: sessionId}, {
            data: sc.toJsonString(sessionData)
        });
        await AdminPanelSession.expectLoggedOut(page, longRun);
        expect(
            await E2eSeedAndRestoreApi.loadRows(gameConfig, 'adminSessions', {sid: sessionId}),
            'The rejected session must be destroyed'
        ).toEqual([]);
        await screenshots.capture(page, 'session-without-revision-rejected');
    }

    static async runLogoutDeletesRowTest(page, screenshots, gameConfig, longRun)
    {
        await AdminPanelSession.loginAsAdmin(page, gameConfig, longRun);
        let sessionId = await AdminPanelSession.fetchSessionId(page);
        expect((await E2eSeedAndRestoreApi.loadRows(gameConfig, 'adminSessions', {sid: sessionId})).length).toBe(1);
        let logoutResponse = await page.request.post(AdminPanelSession.adminPath(gameConfig)+'/logout', {
            form: {_csrf: await AdminPanelSession.fetchCsrfToken(page)},
            maxRedirects: 0
        });
        expect(logoutResponse.status(), 'The logout must be processed').toBe(302);
        expect(
            await E2eSeedAndRestoreApi.loadRows(gameConfig, 'adminSessions', {sid: sessionId}),
            'The logout must delete the stored session'
        ).toEqual([]);
        await screenshots.capture(page, 'logout-deleted-stored-session');
    }

    static run()
    {
        test.describe('Admin Login Identity', () => {
            test('unknown email gets the same answer as a wrong password', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAdminLoginIdentity.runUnknownEmailTest(page, screenshots, gameConfig, longRun);
            });
            test('email with SQL metacharacters matches no account', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAdminLoginIdentity.runSqlMetacharactersTest(page, screenshots, gameConfig, longRun);
            });
            test('long emails count on their truncated identity', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAdminLoginIdentity.runLongEmailsTest(page, screenshots, gameConfig, longRun);
            });
            test('upper case email logs in the stored user', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAdminLoginIdentity.runUpperCaseEmailTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('correct login after failures opens the dashboard and clears them', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAdminLoginIdentity.runFailuresClearedTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('admin login changes the session id', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAdminLoginIdentity.runSessionFixationTest(page, screenshots, gameConfig, longRun);
            });
            test('stored session without its revision is rejected and destroyed', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAdminLoginIdentity.runMissingRevisionTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('logout deletes the stored session row', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAdminLoginIdentity.runLogoutDeletesRowTest(page, screenshots, gameConfig, longRun);
            });
        });
    }

}

TestAdminLoginIdentity.run();
