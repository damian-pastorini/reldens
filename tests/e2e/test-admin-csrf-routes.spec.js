/**
 *
 * Reldens - Test Admin CSRF Routes
 *
 * Tests the administration panel state changing routes without the CSRF token: the entity list, the theme manager, the
 * maps elements editor, the CMS cache and the tileset tool routes, the multipart entity save, the maps wizard (rejected
 * without the token and accepted with it), the server shutdown (never scheduled) and the rooms view forms (nothing
 * stored).
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { AdminPanelSession } = require('./helpers/admin-panel-session');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { Selectors } = require('./selectors');
const { RoomsConst } = require('../../lib/rooms/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAdminCsrfRoutes
{

    static ROOMS_VIEW_FORMS = [{setAsDefault: '1'}, {createRoomsLink: '1'}, {createDefaultReturnPoint: '1'}];
    static ROUTES_WITHOUT_TOKEN = [
        '/features',
        '/theme-manager',
        '/maps-elements-editor/api/save-map-edit',
        '/maps-elements-editor/api/restore-backup',
        '/maps-elements-editor/api/delete-backup',
        '/maps-elements-editor/api/ensure-initial-backup',
        '/maps-elements-editor/api/resize-map',
        '/cache-clean',
        '/cache-clear-all',
        '/tileset-analyzer/sessions/e2e-missing-session/save',
        '/tileset-analyzer/generate',
        '/tileset-analyzer/merge',
        '/tileset-analyzer/ai-detect',
        '/tileset-analyzer/ai-name',
        '/tileset-analyzer/ai-assign-layers'
    ];

    static async runRoutesWithoutTokenTest(page, screenshots, gameConfig, longRun)
    {
        let adminPath = AdminPanelSession.adminPath(gameConfig);
        await AdminPanelSession.loginAsAdmin(page, gameConfig, longRun);
        for(let routePath of TestAdminCsrfRoutes.ROUTES_WITHOUT_TOKEN){
            await AdminPanelSession.expectRejectedPost(page, adminPath+routePath, {form: {}}, routePath+' without the token');
        }
        await screenshots.capture(page, 'routes-without-token-rejected');
    }

    static async runMultipartSaveWithoutTokenTest(page, screenshots, gameConfig, longRun)
    {
        await AdminPanelSession.loginAsAdmin(page, gameConfig, longRun);
        await AdminPanelSession.expectRejectedPost(
            page,
            AdminPanelSession.adminPath(gameConfig)+'/audio/save',
            {
                multipart: {
                    id: '3',
                    files_name: {name: 'e2e-rejected.mp3', mimeType: 'audio/mpeg', buffer: Buffer.from('e2e')}
                }
            },
            'Multipart entity save without the token'
        );
        await screenshots.capture(page, 'multipart-save-without-token-rejected');
    }

    static async runMapsWizardTokenTest(page, screenshots, gameConfig, longRun)
    {
        let wizardPath = AdminPanelSession.adminPath(gameConfig)+'/maps-wizard';
        await AdminPanelSession.loginAsAdmin(page, gameConfig, longRun);
        let csrfToken = await AdminPanelSession.fetchCsrfToken(page);
        await AdminPanelSession.expectRejectedPost(
            page,
            wizardPath,
            {multipart: {mainAction: 'import'}},
            'Maps wizard upload without the token'
        );
        let uploadResponse = await page.request.post(wizardPath, {
            multipart: {_csrf: csrfToken, mainAction: 'import'},
            maxRedirects: 0
        });
        expect(uploadResponse.status(), 'Maps wizard upload with the token').toBe(302);
        await AdminPanelSession.expectRejectedPost(
            page,
            wizardPath+'/api/save-config',
            {form: {sessionId: 'e2e'}},
            'Maps wizard save configuration without the token'
        );
        let saveConfigResponse = await page.request.post(wizardPath+'/api/save-config', {
            form: {_csrf: csrfToken},
            maxRedirects: 0
        });
        expect(saveConfigResponse.status(), 'Maps wizard save configuration with the token').toBe(400);
        await screenshots.capture(page, 'maps-wizard-tokens-checked');
    }

    static async runManagementWithoutTokenTest(page, screenshots, gameConfig, longRun)
    {
        let managementPath = AdminPanelSession.adminPath(gameConfig)+'/management';
        await AdminPanelSession.loginAsAdmin(page, gameConfig, longRun);
        await AdminPanelSession.expectRejectedPost(
            page,
            managementPath,
            {form: {'shutdown-time': '9999'}},
            'Server shutdown without the token'
        );
        await page.goto(managementPath);
        await expect(page.locator(Selectors.admin.shuttingDownTime), 'No shutdown must be scheduled').toHaveAttribute(
            'data-shutting-down-time',
            ''
        );
        await screenshots.capture(page, 'shutdown-without-token-not-started');
    }

    static async runRoomsViewWithoutTokenTest(page, screenshots, gameConfig, longRun)
    {
        let defaultRoomPath = 'server/'+RoomsConst.DEFAULT_ROOM_CONFIG_PATH;
        let storedChangePoints = await E2eSeedAndRestoreApi.loadRows(gameConfig, 'roomsChangePoints', {});
        let storedDefaultRoom = await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, defaultRoomPath);
        await AdminPanelSession.loginAsAdmin(page, gameConfig, longRun);
        for(let viewForm of TestAdminCsrfRoutes.ROOMS_VIEW_FORMS){
            await AdminPanelSession.expectRejectedPost(
                page,
                AdminPanelSession.adminPath(gameConfig)+'/rooms/view?id=2',
                {form: viewForm},
                'Rooms view form without the token: '+Object.keys(viewForm).join(',')
            );
        }
        expect(await E2eSeedAndRestoreApi.loadRows(gameConfig, 'roomsChangePoints', {})).toEqual(storedChangePoints);
        expect(await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, defaultRoomPath)).toEqual(storedDefaultRoom);
        await screenshots.capture(page, 'rooms-view-without-token-unchanged');
    }

    static run()
    {
        test.describe('Admin CSRF Routes', () => {
            test(
                'admin state changing routes without the token are rejected',
                async ({ page, screenshots, gameConfig, longRun }) => {
                    await TestAdminCsrfRoutes.runRoutesWithoutTokenTest(page, screenshots, gameConfig, longRun);
                }
            );
            test(
                'admin multipart entity save without the token is rejected',
                async ({ page, screenshots, gameConfig, longRun }) => {
                    await TestAdminCsrfRoutes.runMultipartSaveWithoutTokenTest(page, screenshots, gameConfig, longRun);
                }
            );
            test(
                'maps wizard routes check the token',
                async ({ page, screenshots, gameConfig, longRun }) => {
                    await TestAdminCsrfRoutes.runMapsWizardTokenTest(page, screenshots, gameConfig, longRun);
                }
            );
            test(
                'server shutdown without the token is not scheduled',
                async ({ page, screenshots, gameConfig, longRun }) => {
                    await TestAdminCsrfRoutes.runManagementWithoutTokenTest(page, screenshots, gameConfig, longRun);
                }
            );
            test(
                'rooms view forms without the token change nothing',
                async ({ page, screenshots, gameConfig, longRun }) => {
                    await TestAdminCsrfRoutes.runRoomsViewWithoutTokenTest(page, screenshots, gameConfig, longRun);
                }
            );
        });
    }

}

TestAdminCsrfRoutes.run();
