/**
 *
 * Reldens - Test Admin Session Access
 *
 * Tests who can use the administration panel: without a session every panel, tool, JSON and statics route redirects to
 * the login, a user that is not an administrator is rejected and counted as a failed login, the failed login shows its
 * error, the empty fields are rejected, and a logged administrator loses the session when its role or password change,
 * when its row or its stored session are deleted, when the stored session expires or when it is banned. The cases use
 * an administrator seeded for the test, so the shared root user never changes.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { AdminPanelSession } = require('./helpers/admin-panel-session');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { SecurityApi } = require('./helpers/security-api');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAdminSessionAccess
{

    static NON_ADMIN_ROLE_ID = 1;
    static LOGIN_ATTEMPTS_LIMIT = 3;
    static SEEDED_PASSWORD = 'root';
    static EXPIRED_SESSION_TIME = 1;
    static ROUTES_WITHOUT_SESSION = [
        '/features',
        '/features/view?id=1',
        '/features/edit?id=1',
        '/management',
        '/maps-wizard',
        '/objects-import',
        '/skills-import',
        '/tileset-analyzer/',
        '/dashboard/stats',
        '/server-health/usage',
        '/rooms/active-players',
        '/generate-data/e2e-missing.json',
        '/generated/e2e-missing.json',
        '/tileset-analyzer/output/e2e-missing.json'
    ];

    static async runRoutesWithoutSessionTest(page, screenshots, gameConfig)
    {
        let adminPath = AdminPanelSession.adminPath(gameConfig);
        for(let routePath of TestAdminSessionAccess.ROUTES_WITHOUT_SESSION){
            let response = await page.request.get(adminPath+routePath, {maxRedirects: 0});
            expect(response.status(), routePath+' without a session').toBe(302);
            expect(response.headers()['location'], routePath+' must redirect to the login').toBe(adminPath+'/login');
        }
        await screenshots.capture(page, 'routes-without-session-redirected');
    }

    static async runNonAdministratorTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let seededUser = await AdminPanelSession.seedUser(gameConfig, e2eGroup, TestAdminSessionAccess.NON_ADMIN_ROLE_ID);
        await SecurityApi.updateSettings(gameConfig, {maxAttempts: TestAdminSessionAccess.LOGIN_ATTEMPTS_LIMIT});
        for(let attempt = 1; TestAdminSessionAccess.LOGIN_ATTEMPTS_LIMIT >= attempt; attempt++){
            await AdminPanelSession.submitAdminLogin(
                page,
                gameConfig,
                longRun,
                seededUser.email,
                TestAdminSessionAccess.SEEDED_PASSWORD
            );
            expect(page.url(), 'A valid login of another role must be rejected').toContain('login-error=true');
            await expect(page.locator(Selectors.admin.dashboard)).toHaveCount(0);
        }
        expect(
            (await SecurityApi.fetchStoredBlocks(gameConfig)).length,
            'The rejected logins must be counted as failures'
        ).toBeGreaterThan(0);
        await screenshots.capture(page, 'non-administrator-rejected');
    }

    static async runFailedLoginMessageTest(page, screenshots, gameConfig, longRun)
    {
        await AdminPanelSession.submitAdminLogin(page, gameConfig, longRun, gameConfig.adminUser, 'e2e-wrong-password');
        await expect(page.locator(Selectors.admin.loginError)).toHaveText('Login error, please try again.', {
            timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun)
        });
        await screenshots.capture(page, 'failed-login-message');
    }

    static async runEmptyFieldsTest(page, screenshots, gameConfig, longRun)
    {
        let loginUrl = AdminPanelSession.adminPath(gameConfig)+'/login';
        await AdminPanelSession.openLogin(page, gameConfig, longRun);
        let csrfToken = await AdminPanelSession.fetchCsrfToken(page);
        for(let credentials of [{email: '', password: 'root'}, {email: gameConfig.adminUser, password: ''}]){
            let response = await page.request.post(loginUrl, {
                form: Object.assign({_csrf: csrfToken}, credentials),
                maxRedirects: 0
            });
            expect(response.status(), 'Empty field login').toBe(302);
            expect(response.headers()['location']).toBe(loginUrl+'?login-error=true');
        }
        await screenshots.capture(page, 'empty-fields-rejected');
    }

    static async loginSeededAdministrator(page, gameConfig, e2eGroup, longRun)
    {
        let seededUser = await AdminPanelSession.seedUser(gameConfig, e2eGroup);
        await AdminPanelSession.loginAsAdmin(page, gameConfig, longRun, seededUser.email, TestAdminSessionAccess.SEEDED_PASSWORD);
        return seededUser;
    }

    static async runUserChangedTest(page, screenshots, gameConfig, e2eGroup, longRun, patch, captureLabel)
    {
        let seededUser = await TestAdminSessionAccess.loginSeededAdministrator(page, gameConfig, e2eGroup, longRun);
        await AdminPanelSession.expectLoggedIn(page, gameConfig, longRun);
        await E2eSeedAndRestoreApi.updateCreatedRow(gameConfig, e2eGroup, 'users', seededUser.id, patch);
        await AdminPanelSession.expectLoggedOut(page, longRun);
        await screenshots.capture(page, captureLabel);
    }

    static async deleteRowFromPanel(rootPage, gameConfig, longRun, entityPath, rowId)
    {
        await AdminPanelSession.loginAsAdmin(rootPage, gameConfig, longRun);
        let deleteResponse = await rootPage.request.post(AdminPanelSession.adminPath(gameConfig)+'/'+entityPath+'/delete', {
            form: {'ids[]': String(rowId), _csrf: await AdminPanelSession.fetchCsrfToken(rootPage)},
            maxRedirects: 0
        });
        expect(deleteResponse.status(), 'The panel delete must be processed').toBe(302);
    }

    static async runDeletedUserTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun)
    {
        let seededUser = await TestAdminSessionAccess.loginSeededAdministrator(page, gameConfig, e2eGroup, longRun);
        await TestAdminSessionAccess.deleteRowFromPanel(secondPage, gameConfig, longRun, 'users', seededUser.id);
        expect(await E2eSeedAndRestoreApi.loadRows(gameConfig, 'users', {id: seededUser.id})).toEqual([]);
        await AdminPanelSession.expectLoggedOut(page, longRun);
        await screenshots.capture(page, 'deleted-user-session-ended');
    }

    static async runTwoSessionsTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun)
    {
        let seededUser = await TestAdminSessionAccess.loginSeededAdministrator(page, gameConfig, e2eGroup, longRun);
        await AdminPanelSession.loginAsAdmin(
            secondPage,
            gameConfig,
            longRun,
            seededUser.email,
            TestAdminSessionAccess.SEEDED_PASSWORD
        );
        let logoutResponse = await page.request.post(AdminPanelSession.adminPath(gameConfig)+'/logout', {
            form: {_csrf: await AdminPanelSession.fetchCsrfToken(page)},
            maxRedirects: 0
        });
        expect(logoutResponse.status(), 'The logout must be processed').toBe(302);
        await AdminPanelSession.expectLoggedIn(secondPage, gameConfig, longRun);
        await AdminPanelSession.loginAsAdmin(page, gameConfig, longRun, seededUser.email, TestAdminSessionAccess.SEEDED_PASSWORD);
        let banResult = await SecurityApi.banUser(gameConfig, seededUser.username);
        expect(banResult.ok, 'The seeded administrator must be banned').toBeTruthy();
        await AdminPanelSession.expectLoggedOut(page, longRun);
        await AdminPanelSession.expectLoggedOut(secondPage, longRun);
        await screenshots.capture(secondPage, 'banned-administrator-both-sessions-ended');
    }

    static async runExpiredSessionTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        await TestAdminSessionAccess.loginSeededAdministrator(page, gameConfig, e2eGroup, longRun);
        await E2eSeedAndRestoreApi.updateWithPreserve(
            gameConfig,
            e2eGroup,
            'adminSessions',
            {sid: await AdminPanelSession.fetchSessionId(page)},
            {expires: TestAdminSessionAccess.EXPIRED_SESSION_TIME}
        );
        await AdminPanelSession.expectLoggedOut(page, longRun);
        await screenshots.capture(page, 'expired-session-ended');
    }

    static async runDeletedSessionRowTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun)
    {
        await TestAdminSessionAccess.loginSeededAdministrator(page, gameConfig, e2eGroup, longRun);
        let sessionRow = [...await E2eSeedAndRestoreApi.loadRows(
            gameConfig,
            'adminSessions',
            {sid: await AdminPanelSession.fetchSessionId(page)}
        )].shift();
        await TestAdminSessionAccess.deleteRowFromPanel(secondPage, gameConfig, longRun, 'admin-sessions', sessionRow.id);
        await AdminPanelSession.expectLoggedOut(page, longRun);
        await screenshots.capture(page, 'deleted-session-row-ended');
    }

    static run()
    {
        test.describe('Admin Session Access', () => {
            test('admin routes without a session redirect to the login', async ({ page, screenshots, gameConfig }) => {
                await TestAdminSessionAccess.runRoutesWithoutSessionTest(page, screenshots, gameConfig);
            });
            test('valid credentials of another role are rejected and counted', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAdminSessionAccess.runNonAdministratorTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('failed admin login shows its error in the form', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAdminSessionAccess.runFailedLoginMessageTest(page, screenshots, gameConfig, longRun);
            });
            test('admin login with an empty email or password is rejected', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAdminSessionAccess.runEmptyFieldsTest(page, screenshots, gameConfig, longRun);
            });
            test('logged administrator moved to another role loses the session', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAdminSessionAccess.runUserChangedTest(page, screenshots, gameConfig, e2eGroup, longRun, {
                    role_id: TestAdminSessionAccess.NON_ADMIN_ROLE_ID
                }, 'moved-role-session-ended');
            });
            test('logged administrator whose password changed loses the session', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAdminSessionAccess.runUserChangedTest(page, screenshots, gameConfig, e2eGroup, longRun, {
                    password: 'e2e-changed-password-hash'
                }, 'changed-password-session-ended');
            });
            test('logged administrator whose user row was deleted loses the session', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAdminSessionAccess.runDeletedUserTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('logout keeps the other session and a ban ends both', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAdminSessionAccess.runTwoSessionsTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('expired stored session redirects to the login', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAdminSessionAccess.runExpiredSessionTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('deleting the stored session in the panel ends that session', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAdminSessionAccess.runDeletedSessionRowTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun);
            });
        });
    }

}

TestAdminSessionAccess.run();
