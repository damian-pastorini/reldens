/**
 *
 * Reldens - Test Admin No Session Posts
 *
 * Tests the administration panel state changing routes with a valid token and no logged administrator: the token of
 * the login page passes the CSRF check, so every request is redirected to the login by the session check, before any
 * uploader or handler runs, and nothing is stored, deleted or scheduled.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { AdminPanelSession } = require('./helpers/admin-panel-session');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { Selectors } = require('./selectors');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAdminNoSessionPosts
{

    static FORM_ROUTES = [
        {path: '/management', fields: {'shutdown-time': '9999'}},
        {path: '/theme-manager', fields: {}},
        {path: '/maps-wizard/api/save-config', fields: {sessionId: 'e2e'}},
        {path: '/rooms/view?id=2', fields: {createRoomsLink: '1'}}
    ];
    static MULTIPART_ROUTES = ['/audio/save', '/maps-wizard', '/objects-import', '/skills-import'];

    static async expectRedirectedToLogin(page, gameConfig, routePath, requestOptions)
    {
        let adminPath = AdminPanelSession.adminPath(gameConfig);
        let response = await page.request.post(adminPath+routePath, Object.assign({maxRedirects: 0}, requestOptions));
        expect(response.status(), routePath+' without a session').toBe(302);
        expect(response.headers()['location'], routePath+' must redirect to the login').toBe(adminPath+'/login');
    }

    static async openLoginAndFetchToken(page, gameConfig, longRun)
    {
        await AdminPanelSession.openLogin(page, gameConfig, longRun);
        return await AdminPanelSession.fetchCsrfToken(page);
    }

    static async runConfigSaveTest(page, screenshots, gameConfig, longRun)
    {
        let csrfToken = await TestAdminNoSessionPosts.openLoginAndFetchToken(page, gameConfig, longRun);
        let configPath = 'e2e/no-session-save-'+Date.now();
        await TestAdminNoSessionPosts.expectRedirectedToLogin(page, gameConfig, '/config/save', {
            form: {scope: 'e2e', path: configPath, value: '1', type: '1', _csrf: csrfToken}
        });
        expect(await E2eSeedAndRestoreApi.loadRows(gameConfig, 'config', {path: configPath})).toEqual([]);
        await screenshots.capture(page, 'config-save-without-session');
    }

    static async runConfigDeleteTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let storedRow = await E2eSeedAndRestoreApi.createRow(gameConfig, e2eGroup, 'config', {
            scope: 'e2e',
            path: 'e2e/no-session-delete-'+Date.now(),
            value: '1',
            type: 1
        });
        let csrfToken = await TestAdminNoSessionPosts.openLoginAndFetchToken(page, gameConfig, longRun);
        await TestAdminNoSessionPosts.expectRedirectedToLogin(page, gameConfig, '/config/delete', {
            form: {'ids[]': String(storedRow.id), _csrf: csrfToken}
        });
        expect((await E2eSeedAndRestoreApi.loadRows(gameConfig, 'config', {id: storedRow.id})).length).toBe(1);
        await screenshots.capture(page, 'config-delete-without-session');
    }

    static async runMultipartRoutesTest(page, screenshots, gameConfig, longRun)
    {
        let csrfToken = await TestAdminNoSessionPosts.openLoginAndFetchToken(page, gameConfig, longRun);
        for(let routePath of TestAdminNoSessionPosts.MULTIPART_ROUTES){
            await TestAdminNoSessionPosts.expectRedirectedToLogin(page, gameConfig, routePath, {
                headers: {'X-CSRF-Token': csrfToken},
                multipart: {_csrf: csrfToken, mainAction: 'import', generatorData: '{}'}
            });
        }
        await screenshots.capture(page, 'multipart-routes-without-session');
    }

    static async runFormRoutesTest(page, screenshots, gameConfig, longRun)
    {
        let storedChangePoints = await E2eSeedAndRestoreApi.loadRows(gameConfig, 'roomsChangePoints', {});
        let csrfToken = await TestAdminNoSessionPosts.openLoginAndFetchToken(page, gameConfig, longRun);
        for(let formRoute of TestAdminNoSessionPosts.FORM_ROUTES){
            await TestAdminNoSessionPosts.expectRedirectedToLogin(page, gameConfig, formRoute.path, {
                form: Object.assign({_csrf: csrfToken}, formRoute.fields)
            });
        }
        expect(await E2eSeedAndRestoreApi.loadRows(gameConfig, 'roomsChangePoints', {})).toEqual(storedChangePoints);
        await AdminPanelSession.loginAsAdmin(page, gameConfig, longRun);
        await page.goto(AdminPanelSession.adminPath(gameConfig)+'/management');
        await expect(page.locator(Selectors.admin.shuttingDownTime), 'No shutdown must be scheduled').toHaveAttribute(
            'data-shutting-down-time',
            ''
        );
        await screenshots.capture(page, 'form-routes-without-session');
    }

    static run()
    {
        test.describe('Admin No Session Posts', () => {
            test('entity save with the token and no session stores nothing', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAdminNoSessionPosts.runConfigSaveTest(page, screenshots, gameConfig, longRun);
            });
            test('entity delete with the token and no session keeps the row', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAdminNoSessionPosts.runConfigDeleteTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('upload routes with the token and no session redirect before the uploader', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAdminNoSessionPosts.runMultipartRoutesTest(page, screenshots, gameConfig, longRun);
            });
            test('form routes with the token and no session change nothing', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAdminNoSessionPosts.runFormRoutesTest(page, screenshots, gameConfig, longRun);
            });
        });
    }

}

TestAdminNoSessionPosts.run();
