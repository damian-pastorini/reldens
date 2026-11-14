/**
 *
 * Reldens - Test Admin IP Lists
 *
 * Tests the address lists rows saved in the administration panel, with the lists enabled for a few seconds: a deny row
 * of the client address blocks the pages at once and an allow row of another address rejects the client, while a row
 * with an expiration never enters the lists. The rows are deleted and the lists disabled when that time ends.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { AdminPanelSession } = require('./helpers/admin-panel-session');
const { SecurityApi } = require('./helpers/security-api');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAdminIpLists
{

    static LISTS_ENABLED_MS = 6000;
    static LOCAL_ADDRESSES = ['127.0.0.1', '::1'];
    static OTHER_ADDRESS = '10.255.255.1';
    static EXPIRATION_DATE = '2099-01-01 00:00:00';

    static async enableListsAndLogin(page, gameConfig, longRun)
    {
        await AdminPanelSession.loginAsAdmin(page, gameConfig, longRun);
        let csrfToken = await AdminPanelSession.fetchCsrfToken(page);
        let denyResult = await SecurityApi.denyAddresses(
            gameConfig,
            [TestAdminIpLists.OTHER_ADDRESS],
            TestAdminIpLists.LISTS_ENABLED_MS
        );
        expect(denyResult.ok, 'The lists must be enabled').toBeTruthy();
        return csrfToken;
    }

    static async saveRow(page, gameConfig, csrfToken, row)
    {
        return await page.request.post(AdminPanelSession.adminPath(gameConfig)+'/ip-lists/save', {
            form: Object.assign({_csrf: csrfToken, reason: 'e2e panel row'}, row),
            maxRedirects: 0
        });
    }

    static async waitForListsLifted(page)
    {
        await page.waitForTimeout(TestAdminIpLists.LISTS_ENABLED_MS + 1000);
        expect((await page.goto('/')).status(), 'The address must be allowed again').toBe(200);
    }

    static async runDenyRowTest(page, screenshots, gameConfig, longRun)
    {
        let csrfToken = await TestAdminIpLists.enableListsAndLogin(page, gameConfig, longRun);
        for(let address of TestAdminIpLists.LOCAL_ADDRESSES){
            await TestAdminIpLists.saveRow(page, gameConfig, csrfToken, {address, list_type: 'deny'});
        }
        let deniedResponse = await page.goto('/');
        expect(deniedResponse.status(), 'The saved deny row must apply at once').toBe(403);
        await screenshots.capture(page, 'deny-row-applied');
        await TestAdminIpLists.waitForListsLifted(page);
    }

    static async runExpiringRowTest(page, screenshots, gameConfig, longRun)
    {
        let csrfToken = await TestAdminIpLists.enableListsAndLogin(page, gameConfig, longRun);
        for(let address of TestAdminIpLists.LOCAL_ADDRESSES){
            await TestAdminIpLists.saveRow(page, gameConfig, csrfToken, {
                address,
                list_type: 'deny',
                expires_at: TestAdminIpLists.EXPIRATION_DATE
            });
        }
        expect((await page.goto('/')).status(), 'A row with an expiration must not enter the lists').toBe(200);
        await screenshots.capture(page, 'expiring-row-ignored');
        await TestAdminIpLists.waitForListsLifted(page);
    }

    static async runAllowRowTest(page, screenshots, gameConfig, longRun)
    {
        let csrfToken = await TestAdminIpLists.enableListsAndLogin(page, gameConfig, longRun);
        await TestAdminIpLists.saveRow(page, gameConfig, csrfToken, {address: '10.255.255.2', list_type: 'allow'});
        expect((await page.goto('/')).status(), 'An allow row of another address must reject the client').toBe(403);
        await screenshots.capture(page, 'allow-row-rejects-client');
        await TestAdminIpLists.waitForListsLifted(page);
    }

    static run()
    {
        test.describe('Admin IP Lists', () => {
            test('deny row saved in the panel blocks the client at once', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAdminIpLists.runDenyRowTest(page, screenshots, gameConfig, longRun);
            });
            test('row with an expiration never enters the lists', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAdminIpLists.runExpiringRowTest(page, screenshots, gameConfig, longRun);
            });
            test('allow row of another address rejects the client', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAdminIpLists.runAllowRowTest(page, screenshots, gameConfig, longRun);
            });
        });
    }

}

TestAdminIpLists.run();
