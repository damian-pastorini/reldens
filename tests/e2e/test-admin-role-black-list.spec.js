/**
 *
 * Reldens - Test Admin Role Black List
 *
 * Tests the redirect of a logged administrator asking a path of its role black list: the local referer of the panel is
 * followed, and a request with an invalid referer, an external one or a local one outside the panel goes to the login.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { AdminPanelSession } = require('./helpers/admin-panel-session');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { SecurityApi } = require('./helpers/security-api');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAdminRoleBlackList
{

    static BLOCKED_PATH = '/features';

    static async prepareBlackList(page, gameConfig, longRun)
    {
        let rootUser = [...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'users', {username: gameConfig.e2eUsername})].shift();
        await SecurityApi.request(gameConfig, 'POST', '/api/e2e/security/admin-black-list', {
            blackList: {[rootUser.role_id]: [TestAdminRoleBlackList.BLOCKED_PATH]}
        });
        await AdminPanelSession.loginAsAdmin(page, gameConfig, longRun);
        return AdminPanelSession.adminPath(gameConfig);
    }

    static async requestBlockedPath(page, adminPath, referer)
    {
        return await page.request.get(adminPath+TestAdminRoleBlackList.BLOCKED_PATH, {
            headers: {referer},
            maxRedirects: 0
        });
    }

    static async runLocalRefererTest(page, screenshots, gameConfig, longRun)
    {
        let adminPath = await TestAdminRoleBlackList.prepareBlackList(page, gameConfig, longRun);
        let origin = new URL(page.url()).origin;
        let response = await TestAdminRoleBlackList.requestBlockedPath(page, adminPath, origin+adminPath+'/management?tab=1');
        expect(response.status()).toBe(302);
        expect(response.headers()['location'], 'The panel referer must be followed').toBe(adminPath+'/management?tab=1');
        await screenshots.capture(page, 'black-list-local-referer');
    }

    static async runRejectedRefererTest(page, screenshots, gameConfig, longRun)
    {
        let adminPath = await TestAdminRoleBlackList.prepareBlackList(page, gameConfig, longRun);
        let origin = new URL(page.url()).origin;
        let referers = ['not a valid referer', 'https://e2e-external.example'+adminPath+'/management', origin+'/outside-the-panel'];
        for(let referer of referers){
            let response = await TestAdminRoleBlackList.requestBlockedPath(page, adminPath, referer);
            expect(response.status(), referer).toBe(302);
            expect(response.headers()['location'], referer).toBe(adminPath+'/login');
        }
        await screenshots.capture(page, 'black-list-rejected-referers');
    }

    static run()
    {
        test.describe('Admin Role Black List', () => {
            test('black listed path follows a referer of the panel', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAdminRoleBlackList.runLocalRefererTest(page, screenshots, gameConfig, longRun);
            });
            test('black listed path with an invalid, external or outside referer goes to the login', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAdminRoleBlackList.runRejectedRefererTest(page, screenshots, gameConfig, longRun);
            });
        });
    }

}

TestAdminRoleBlackList.run();
