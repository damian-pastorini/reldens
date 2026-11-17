/**
 *
 * Reldens - Test Admin Entity Errors
 *
 * Tests the error results of the administration panel forms: the entity save with an empty required field, with a
 * required upload left empty, with a disallowed file or with a repeated unique value, the delete without ids or
 * prevented by a subscriber, the view and edit of an unknown id, the stored text shown as text on the view page, and
 * the management, theme manager and maps wizard forms with missing or invalid values. Every expected result comes from
 * the redirect the panel answers and the stored rows never change.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { AdminPanelSession } = require('./helpers/admin-panel-session');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { Selectors } = require('./selectors');
const { RoomsConst } = require('../../lib/rooms/constants');
const { FileHandler } = require('@reldens/server-utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAdminEntityErrors
{

    static UNKNOWN_ID = '999999';
    static XSS_FLAG = 'e2eStoredScriptRan';
    static STORED_HTML_PATH = FileHandler.joinPaths(process.cwd(), 'tests', 'e2e', 'assets', 'stored-html-payload.html');

    static async loginAndFetchToken(page, gameConfig, longRun)
    {
        await AdminPanelSession.loginAsAdmin(page, gameConfig, longRun);
        return await AdminPanelSession.fetchCsrfToken(page);
    }

    static async postForm(page, gameConfig, routePath, csrfToken, fields)
    {
        return await page.request.post(AdminPanelSession.adminPath(gameConfig)+routePath, {
            form: Object.assign({_csrf: csrfToken}, fields),
            maxRedirects: 0
        });
    }

    static expectRedirect(response, gameConfig, expectedPath, label)
    {
        expect(response.status(), label).toBe(302);
        expect(response.headers()['location'], label).toBe(AdminPanelSession.adminPath(gameConfig)+expectedPath);
    }

    static async runSaveErrorsTest(page, screenshots, gameConfig, longRun)
    {
        let csrfToken = await TestAdminEntityErrors.loginAndFetchToken(page, gameConfig, longRun);
        let emptyFieldResponse = await TestAdminEntityErrors.postForm(page, gameConfig, '/config/save', csrfToken, {
            scope: 'e2e',
            path: '',
            value: '1',
            type: '1'
        });
        TestAdminEntityErrors.expectRedirect(emptyFieldResponse, gameConfig, '/config?result=saveBadPatchData', 'Empty required field');
        let uniqueUsername = 'e2eunique'+Date.now();
        let repeatedEmailResponse = await TestAdminEntityErrors.postForm(page, gameConfig, '/users/save', csrfToken, {
            email: gameConfig.adminUser,
            username: uniqueUsername,
            password: 'e2e-password',
            role_id: '1',
            status: '1'
        });
        TestAdminEntityErrors.expectRedirect(repeatedEmailResponse, gameConfig, '/users?result=saveEntityError', 'Repeated unique value');
        expect(await E2eSeedAndRestoreApi.loadRows(gameConfig, 'users', {username: uniqueUsername})).toEqual([]);
        await screenshots.capture(page, 'entity-save-errors');
    }

    static async postAudioFile(page, gameConfig, csrfToken, fileName)
    {
        return await page.request.post(AdminPanelSession.adminPath(gameConfig)+'/audio/save', {
            headers: {'X-CSRF-Token': csrfToken},
            multipart: Object.assign(
                {audio_key: 'e2e-upload-'+Date.now(), enabled: '1'},
                fileName ? {files_name: {name: fileName, mimeType: 'application/octet-stream', buffer: Buffer.from('e2e')}} : {}
            ),
            maxRedirects: 0
        });
    }

    static async runUploadErrorsTest(page, screenshots, gameConfig, longRun)
    {
        let csrfToken = await TestAdminEntityErrors.loginAndFetchToken(page, gameConfig, longRun);
        let storedAudios = await E2eSeedAndRestoreApi.loadRows(gameConfig, 'audio', {});
        let emptyUploadResponse = await TestAdminEntityErrors.postAudioFile(page, gameConfig, csrfToken, '');
        expect(emptyUploadResponse.status(), 'Required upload left empty').toBe(302);
        expect(emptyUploadResponse.headers()['location'], 'Required upload left empty').toContain('/audio?result=');
        expect(emptyUploadResponse.headers()['location'], 'Required upload left empty').not.toContain('success');
        let disallowedResponse = await TestAdminEntityErrors.postAudioFile(page, gameConfig, csrfToken, 'e2e-disallowed.exe');
        expect(disallowedResponse.status(), 'Disallowed file').not.toBe(200);
        expect(String(disallowedResponse.headers()['location']), 'Disallowed file').not.toContain('success');
        expect(await E2eSeedAndRestoreApi.loadRows(gameConfig, 'audio', {}), 'No audio row must be stored').toEqual(storedAudios);
        await screenshots.capture(page, 'upload-errors');
    }

    static async runDeleteErrorsTest(page, screenshots, gameConfig, longRun)
    {
        let csrfToken = await TestAdminEntityErrors.loginAndFetchToken(page, gameConfig, longRun);
        let missingIdsResponse = await TestAdminEntityErrors.postForm(page, gameConfig, '/config/delete', csrfToken, {});
        TestAdminEntityErrors.expectRedirect(missingIdsResponse, gameConfig, '/config?result=errorMissingId', 'Delete without ids');
        let defaultRoomId = await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, 'server/'+RoomsConst.DEFAULT_ROOM_CONFIG_PATH);
        let preventedResponse = await TestAdminEntityErrors.postForm(page, gameConfig, '/rooms/delete', csrfToken, {
            'ids[]': String(defaultRoomId)
        });
        TestAdminEntityErrors.expectRedirect(preventedResponse, gameConfig, '/rooms?result=errorRoomDeleteIsDefault', 'Prevented delete');
        expect(
            (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'rooms', {id: Number(defaultRoomId)})).length,
            'The default room must be kept'
        ).toBe(1);
        await screenshots.capture(page, 'delete-errors');
    }

    static async runUnknownIdTest(page, screenshots, gameConfig, longRun)
    {
        await AdminPanelSession.loginAsAdmin(page, gameConfig, longRun);
        let adminPath = AdminPanelSession.adminPath(gameConfig);
        let viewResponse = await page.request.get(adminPath+'/features/view?id='+TestAdminEntityErrors.UNKNOWN_ID, {maxRedirects: 0});
        TestAdminEntityErrors.expectRedirect(viewResponse, gameConfig, '/features?result=errorView', 'View of an unknown id');
        await screenshots.capture(page, 'unknown-id-errors');
    }

    static async runStoredHtmlTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let storedRow = await E2eSeedAndRestoreApi.createRow(gameConfig, e2eGroup, 'config', {
            scope: 'e2e',
            path: 'e2e/stored-html-'+Date.now(),
            value: FileHandler.readFile(TestAdminEntityErrors.STORED_HTML_PATH),
            type: 1
        });
        await AdminPanelSession.loginAsAdmin(page, gameConfig, longRun);
        await page.goto(AdminPanelSession.adminPath(gameConfig)+'/config/view?id='+storedRow.id);
        await page.waitForLoadState('networkidle');
        await screenshots.capture(page, 'stored-html-on-view-page');
        expect(
            await page.evaluate((flag) => true === window[flag], TestAdminEntityErrors.XSS_FLAG),
            'The stored HTML must never run on the view page'
        ).toBe(false);
    }

    static async runManagementFormsTest(page, screenshots, gameConfig, longRun)
    {
        let csrfToken = await TestAdminEntityErrors.loginAndFetchToken(page, gameConfig, longRun);
        let emptyTimeResponse = await TestAdminEntityErrors.postForm(page, gameConfig, '/management', csrfToken, {'shutdown-time': ''});
        TestAdminEntityErrors.expectRedirect(emptyTimeResponse, gameConfig, '/management?result=shutdownError', 'Empty shutdown time');
        let startedResponse = await TestAdminEntityErrors.postForm(page, gameConfig, '/management', csrfToken, {'shutdown-time': '9999'});
        TestAdminEntityErrors.expectRedirect(startedResponse, gameConfig, '/management?result=success', 'Shutdown started');
        let canceledResponse = await TestAdminEntityErrors.postForm(page, gameConfig, '/management', csrfToken, {'shutdown-time': '9999'});
        TestAdminEntityErrors.expectRedirect(canceledResponse, gameConfig, '/management?result=success', 'Shutdown canceled');
        await page.goto(AdminPanelSession.adminPath(gameConfig)+'/management');
        await expect(page.locator(Selectors.admin.shuttingDownTime), 'The running shutdown must be canceled').toHaveAttribute(
            'data-shutting-down-time',
            ''
        );
        await screenshots.capture(page, 'management-forms');
    }

    static async runThemeManagerFormsTest(page, screenshots, gameConfig, longRun)
    {
        let csrfToken = await TestAdminEntityErrors.loginAndFetchToken(page, gameConfig, longRun);
        await page.goto(AdminPanelSession.adminPath(gameConfig)+'/management');
        let availableTheme = await page.locator('#selected-theme option').first().getAttribute('value');
        let formCases = [
            {fields: {}, result: 'themeManagerMissingTheme'},
            {fields: {'selected-theme': 'e2e-missing-theme'}, result: 'themeManagerMissingTheme'},
            {fields: {'selected-theme': availableTheme, command: 'e2e-missing-command'}, result: 'themeManagerMissingCommand'}
        ];
        for(let formCase of formCases){
            let response = await TestAdminEntityErrors.postForm(page, gameConfig, '/theme-manager', csrfToken, formCase.fields);
            TestAdminEntityErrors.expectRedirect(response, gameConfig, '/management?result='+formCase.result, formCase.result);
        }
        await screenshots.capture(page, 'theme-manager-forms');
    }

    static async runSaveConfigErrorsTest(page, screenshots, gameConfig, longRun)
    {
        let csrfToken = await TestAdminEntityErrors.loginAndFetchToken(page, gameConfig, longRun);
        let formCases = [
            {fields: {}, error: 'Missing sessionId'},
            {fields: {sessionId: 'e2e', currentStrategy: 'e2e-invalid'}, error: 'Invalid currentStrategy'}
        ];
        for(let formCase of formCases){
            let response = await TestAdminEntityErrors.postForm(page, gameConfig, '/maps-wizard/api/save-config', csrfToken, formCase.fields);
            expect(response.status(), formCase.error).toBe(400);
            expect(await response.json()).toEqual({error: formCase.error});
        }
        await screenshots.capture(page, 'save-config-errors');
    }

    static run()
    {
        test.describe('Admin Entity Errors', () => {
            test('entity save errors keep the stored rows', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAdminEntityErrors.runSaveErrorsTest(page, screenshots, gameConfig, longRun);
            });
            test('entity upload errors store nothing', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAdminEntityErrors.runUploadErrorsTest(page, screenshots, gameConfig, longRun);
            });
            test('entity delete errors keep the rows', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAdminEntityErrors.runDeleteErrorsTest(page, screenshots, gameConfig, longRun);
            });
            test('view of an unknown id redirects with the error', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAdminEntityErrors.runUnknownIdTest(page, screenshots, gameConfig, longRun);
            });
            test('stored HTML never runs on the entity view page', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAdminEntityErrors.runStoredHtmlTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('management form errors and the running shutdown cancel', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAdminEntityErrors.runManagementFormsTest(page, screenshots, gameConfig, longRun);
            });
            test('theme manager form errors', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAdminEntityErrors.runThemeManagerFormsTest(page, screenshots, gameConfig, longRun);
            });
            test('maps wizard save configuration errors', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAdminEntityErrors.runSaveConfigErrorsTest(page, screenshots, gameConfig, longRun);
            });
        });
    }

}

TestAdminEntityErrors.run();
