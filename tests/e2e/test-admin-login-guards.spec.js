/**
 *
 * Reldens - Test Admin Login Guards
 *
 * Tests the administration login limits: the shared login attempts block rejects the valid credentials, also when the
 * failures came from the game login, the letter case and accent variants share the stored email block, the block ends
 * with its time, the limiter counts per address and email in lower case and never counts the successful logins, and
 * the logins over the password validations cap fail and release their slots.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { AdminPanelSession } = require('./helpers/admin-panel-session');
const { Login } = require('./helpers/login');
const { SecurityApi } = require('./helpers/security-api');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAdminLoginGuards
{

    static ATTEMPTS_LIMIT = 3;
    static SEEDED_PASSWORD = 'root';
    static WRONG_PASSWORD = 'e2e-wrong-password';
    static SHORT_BLOCK_MS = 1000;
    static CONCURRENT_LOGINS = 11;
    static MAX_CONCURRENT_VALIDATIONS = 8;

    static async failLogins(page, gameConfig, longRun, email, total)
    {
        for(let attempt = 1; total >= attempt; attempt++){
            let response = await AdminPanelSession.postLogin(page, gameConfig, longRun, email, TestAdminLoginGuards.WRONG_PASSWORD);
            expect(response.status(), 'Failed login '+attempt).toBe(302);
        }
    }

    static async expectLoginRejected(page, gameConfig, longRun, email, password)
    {
        let response = await AdminPanelSession.postLogin(page, gameConfig, longRun, email, password);
        expect(response.status(), 'The login must be processed').toBe(302);
        expect(response.headers()['location'], 'The valid credentials must be rejected').toContain('login-error=true');
    }

    static async runSharedBlockTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let seededUser = await AdminPanelSession.seedUser(gameConfig, e2eGroup);
        await SecurityApi.updateSettings(gameConfig, {maxAttempts: TestAdminLoginGuards.ATTEMPTS_LIMIT});
        await TestAdminLoginGuards.failLogins(page, gameConfig, longRun, seededUser.email, TestAdminLoginGuards.ATTEMPTS_LIMIT);
        await TestAdminLoginGuards.expectLoginRejected(page, gameConfig, longRun, seededUser.email, TestAdminLoginGuards.SEEDED_PASSWORD);
        await screenshots.capture(page, 'valid-admin-login-blocked');
    }

    static async runGameFailuresBlockTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let seededUser = await AdminPanelSession.seedUser(gameConfig, e2eGroup);
        await SecurityApi.updateSettings(gameConfig, {maxAttempts: TestAdminLoginGuards.ATTEMPTS_LIMIT});
        for(let attempt = 1; TestAdminLoginGuards.ATTEMPTS_LIMIT >= attempt; attempt++){
            await Login.submitLoginExpectingError(page, gameConfig.e2eUsername, 'e2e-wrong-'+attempt, longRun);
        }
        await TestAdminLoginGuards.expectLoginRejected(page, gameConfig, longRun, seededUser.email, TestAdminLoginGuards.SEEDED_PASSWORD);
        await screenshots.capture(page, 'admin-login-blocked-by-game-failures');
    }

    static async runEmailVariantsTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let seededUser = await AdminPanelSession.seedUser(gameConfig, e2eGroup);
        await SecurityApi.updateSettings(gameConfig, {maxAttempts: TestAdminLoginGuards.ATTEMPTS_LIMIT});
        await TestAdminLoginGuards.failLogins(page, gameConfig, longRun, seededUser.email, TestAdminLoginGuards.ATTEMPTS_LIMIT);
        for(let emailVariant of [seededUser.email.toUpperCase(), seededUser.email.replace('e', 'é')]){
            await TestAdminLoginGuards.expectLoginRejected(page, gameConfig, longRun, emailVariant, TestAdminLoginGuards.SEEDED_PASSWORD);
        }
        await screenshots.capture(page, 'admin-email-variants-blocked');
    }

    static async runAddressBlockTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let seededUser = await AdminPanelSession.seedUser(gameConfig, e2eGroup);
        await SecurityApi.updateSettings(gameConfig, {maxAttempts: TestAdminLoginGuards.ATTEMPTS_LIMIT});
        await TestAdminLoginGuards.failLogins(page, gameConfig, longRun, 'e2e-unknown-'+Date.now()+'@yourgame.com', TestAdminLoginGuards.ATTEMPTS_LIMIT);
        await TestAdminLoginGuards.expectLoginRejected(page, gameConfig, longRun, seededUser.email, TestAdminLoginGuards.SEEDED_PASSWORD);
        await screenshots.capture(page, 'admin-address-blocked');
    }

    static async runBlockExpiresTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let seededUser = await AdminPanelSession.seedUser(gameConfig, e2eGroup);
        await SecurityApi.updateSettings(gameConfig, {
            maxAttempts: TestAdminLoginGuards.ATTEMPTS_LIMIT,
            blockTimeMs: TestAdminLoginGuards.SHORT_BLOCK_MS
        });
        await TestAdminLoginGuards.failLogins(page, gameConfig, longRun, seededUser.email, TestAdminLoginGuards.ATTEMPTS_LIMIT);
        await page.waitForTimeout(TestAdminLoginGuards.SHORT_BLOCK_MS);
        await AdminPanelSession.loginAsAdmin(page, gameConfig, longRun, seededUser.email, TestAdminLoginGuards.SEEDED_PASSWORD);
        await screenshots.capture(page, 'admin-login-after-block-time');
    }

    static async fetchRemainingFailures(page, gameConfig, longRun, email)
    {
        let response = await AdminPanelSession.postLogin(page, gameConfig, longRun, email, TestAdminLoginGuards.WRONG_PASSWORD);
        let remainingMatch = String(response.headers()['ratelimit']).match(/r=(\d+)/);
        expect(remainingMatch, 'The login limiter must report the remaining attempts').toBeTruthy();
        return Number([...remainingMatch].pop());
    }

    static async reachLimiter(page, gameConfig, longRun, email)
    {
        await TestAdminLoginGuards.failLogins(
            page,
            gameConfig,
            longRun,
            email,
            await TestAdminLoginGuards.fetchRemainingFailures(page, gameConfig, longRun, email)
        );
    }

    static async expectLimited(page, gameConfig, longRun, email, password, label)
    {
        let response = await AdminPanelSession.postLogin(page, gameConfig, longRun, email, password);
        expect(response.status(), label).toBe(429);
    }

    static async runLimiterKeysTest(page, screenshots, gameConfig, longRun)
    {
        let uniqueKey = Date.now();
        let limitedEmail = 'e2e-limited-'+uniqueKey+'@yourgame.com';
        await TestAdminLoginGuards.reachLimiter(page, gameConfig, longRun, limitedEmail);
        await TestAdminLoginGuards.expectLimited(page, gameConfig, longRun, limitedEmail, TestAdminLoginGuards.WRONG_PASSWORD, 'Same email');
        await TestAdminLoginGuards.expectLimited(page, gameConfig, longRun, limitedEmail.toUpperCase(), TestAdminLoginGuards.WRONG_PASSWORD, 'Upper case variant');
        let otherEmailResponse = await AdminPanelSession.postLogin(
            page,
            gameConfig,
            longRun,
            'e2e-other-'+uniqueKey+'@yourgame.com',
            TestAdminLoginGuards.WRONG_PASSWORD
        );
        expect(otherEmailResponse.status(), 'Another email from the same address is not limited').toBe(302);
        await screenshots.capture(page, 'admin-limiter-keys');
    }

    static async runLimiterWithValidCredentialsTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let seededUser = await AdminPanelSession.seedUser(gameConfig, e2eGroup);
        await TestAdminLoginGuards.reachLimiter(page, gameConfig, longRun, seededUser.email);
        await TestAdminLoginGuards.expectLimited(
            page,
            gameConfig,
            longRun,
            seededUser.email,
            TestAdminLoginGuards.SEEDED_PASSWORD,
            'Valid credentials over the limit'
        );
        await page.goto(AdminPanelSession.adminPath(gameConfig));
        await expect(page.locator(Selectors.admin.loginForm), 'No session must be created').toBeVisible(
            {timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun)}
        );
        await screenshots.capture(page, 'admin-limited-valid-credentials');
    }

    static async runSuccessfulLoginsNotCountedTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let seededUser = await AdminPanelSession.seedUser(gameConfig, e2eGroup);
        let remainingFailures = await TestAdminLoginGuards.fetchRemainingFailures(
            page,
            gameConfig,
            longRun,
            seededUser.email
        );
        for(let attempt = 0; remainingFailures >= attempt; attempt++){
            let response = await AdminPanelSession.postLogin(page, gameConfig, longRun, seededUser.email, TestAdminLoginGuards.SEEDED_PASSWORD);
            expect(response.status(), 'Successful login '+attempt).toBe(302);
            expect(response.headers()['location'], 'Successful login '+attempt).toBe(AdminPanelSession.adminPath(gameConfig));
        }
        await screenshots.capture(page, 'admin-successful-logins-not-counted');
    }

    static async runConcurrentLoginsTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let seededUser = await AdminPanelSession.seedUser(gameConfig, e2eGroup);
        await AdminPanelSession.openLogin(page, gameConfig, longRun);
        let csrfToken = await AdminPanelSession.fetchCsrfToken(page);
        let loginUrl = AdminPanelSession.adminPath(gameConfig)+'/login';
        let responses = await Promise.all(Array.from({length: TestAdminLoginGuards.CONCURRENT_LOGINS}, () => page.request.post(loginUrl, {
            form: {email: seededUser.email, password: TestAdminLoginGuards.SEEDED_PASSWORD, _csrf: csrfToken},
            maxRedirects: 0
        })));
        let rejected = responses.filter(response => String(response.headers()['location']).includes('login-error=true'));
        expect(rejected.length, 'The logins over the validations cap must fail').toBe(
            TestAdminLoginGuards.CONCURRENT_LOGINS - TestAdminLoginGuards.MAX_CONCURRENT_VALIDATIONS
        );
        await AdminPanelSession.loginAsAdmin(page, gameConfig, longRun, seededUser.email, TestAdminLoginGuards.SEEDED_PASSWORD);
        await screenshots.capture(page, 'admin-validation-slots-released');
    }

    static run()
    {
        test.describe('Admin Login Guards', () => {
            test('valid admin credentials are rejected while the login attempts block is active', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAdminLoginGuards.runSharedBlockTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('failed game logins block the admin login of the same address', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAdminLoginGuards.runGameFailuresBlockTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('admin email case and accent variants share the stored email block', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAdminLoginGuards.runEmailVariantsTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('address blocked by admin failures rejects another valid administrator', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAdminLoginGuards.runAddressBlockTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('correct admin login works once the block time passed', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAdminLoginGuards.runBlockExpiresTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('admin login limiter counts per address and lower case email', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAdminLoginGuards.runLimiterKeysTest(page, screenshots, gameConfig, longRun);
            });
            test('admin login limiter rejects valid credentials over the limit', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAdminLoginGuards.runLimiterWithValidCredentialsTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('successful admin logins are not counted by the limiter', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAdminLoginGuards.runSuccessfulLoginsNotCountedTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('admin logins over the validations cap fail and release their slots', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAdminLoginGuards.runConcurrentLoginsTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
        });
    }

}

TestAdminLoginGuards.run();
