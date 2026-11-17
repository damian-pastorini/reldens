/**
 *
 * Reldens - Test Admin CSRF Tokens
 *
 * Tests the values of the administration panel CSRF token: a logged administrator request with a wrong token (sent in
 * the body or in the header, with the same length, shorter or longer than the session token), with the token of another
 * administrator session or with the token issued before the login is rejected and stores nothing. A logout or an entity
 * delete without the token keeps the session and the row, and the bulk delete of the entity list sends the token.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { AdminPanelSession } = require('./helpers/admin-panel-session');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAdminCsrfTokens
{

    static BULK_DELETE_LOCALES = ['xa_XA', 'xb_XB'];

    static createWrongTokens(csrfToken)
    {
        return {
            sameLength: csrfToken.slice(0, -1)+('0' === csrfToken.slice(-1) ? '1' : '0'),
            shorter: csrfToken.slice(0, -1),
            longer: csrfToken+'0'
        };
    }

    static async runWrongTokenTest(page, screenshots, gameConfig, longRun)
    {
        let saveUrl = AdminPanelSession.adminPath(gameConfig)+'/features/save';
        await AdminPanelSession.loginAsAdmin(page, gameConfig, longRun);
        let wrongTokens = TestAdminCsrfTokens.createWrongTokens(await AdminPanelSession.fetchCsrfToken(page));
        let storedFeature = await E2eSeedAndRestoreApi.loadRows(gameConfig, 'features', {id: 1});
        let saveForm = {id: '1', code: 'chat', title: 'e2e-wrong-token', is_enabled: '1'};
        for(let tokenKind of Object.keys(wrongTokens)){
            await AdminPanelSession.expectRejectedPost(
                page,
                saveUrl,
                {form: Object.assign({_csrf: wrongTokens[tokenKind]}, saveForm)},
                'Wrong body token: '+tokenKind
            );
            await AdminPanelSession.expectRejectedPost(
                page,
                saveUrl,
                {form: saveForm, headers: {'X-CSRF-Token': wrongTokens[tokenKind]}},
                'Wrong header token: '+tokenKind
            );
        }
        expect(
            await E2eSeedAndRestoreApi.loadRows(gameConfig, 'features', {id: 1}),
            'A rejected save must not change the stored row'
        ).toEqual(storedFeature);
        await screenshots.capture(page, 'wrong-tokens-rejected');
    }

    static async expectRejectedSave(requestPage, gameConfig, csrfToken, label)
    {
        let storedFeature = await E2eSeedAndRestoreApi.loadRows(gameConfig, 'features', {id: 1});
        await AdminPanelSession.expectRejectedPost(
            requestPage,
            AdminPanelSession.adminPath(gameConfig)+'/features/save',
            {form: {id: '1', code: 'chat', title: 'e2e-rejected-token', is_enabled: '1', _csrf: csrfToken}},
            label
        );
        expect(
            await E2eSeedAndRestoreApi.loadRows(gameConfig, 'features', {id: 1}),
            'A rejected save must not change the stored row'
        ).toEqual(storedFeature);
    }

    static async runOtherSessionTokenTest(page, secondPage, screenshots, gameConfig, longRun)
    {
        await AdminPanelSession.loginAsAdmin(page, gameConfig, longRun);
        await AdminPanelSession.loginAsAdmin(secondPage, gameConfig, longRun);
        let firstSessionToken = await AdminPanelSession.fetchCsrfToken(page);
        expect(firstSessionToken, 'Every session must have its own token').not.toBe(
            await AdminPanelSession.fetchCsrfToken(secondPage)
        );
        await TestAdminCsrfTokens.expectRejectedSave(
            secondPage,
            gameConfig,
            firstSessionToken,
            'The token of another administrator session'
        );
        await screenshots.capture(secondPage, 'other-session-token-rejected');
    }

    static async runPreLoginTokenTest(page, screenshots, gameConfig, longRun)
    {
        await AdminPanelSession.openLogin(page, gameConfig, longRun);
        let preLoginToken = await AdminPanelSession.fetchCsrfToken(page);
        await AdminPanelSession.loginAsAdmin(page, gameConfig, longRun);
        expect(preLoginToken, 'The login must regenerate the session token').not.toBe(
            await AdminPanelSession.fetchCsrfToken(page)
        );
        await TestAdminCsrfTokens.expectRejectedSave(page, gameConfig, preLoginToken, 'The token issued before the login');
        await screenshots.capture(page, 'pre-login-token-rejected');
    }

    static async runLogoutWithoutTokenTest(page, screenshots, gameConfig, longRun)
    {
        let adminPath = AdminPanelSession.adminPath(gameConfig);
        await AdminPanelSession.loginAsAdmin(page, gameConfig, longRun);
        await AdminPanelSession.expectRejectedPost(page, adminPath+'/logout', {form: {}}, 'Logout without the token');
        await page.goto(adminPath);
        await expect(page.locator(Selectors.admin.dashboard), 'The rejected logout must keep the session').toBeVisible(
            {timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun)}
        );
        await screenshots.capture(page, 'logout-without-token-keeps-session');
    }

    static async runDeleteWithoutTokenTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let storedRow = await E2eSeedAndRestoreApi.createRow(gameConfig, e2eGroup, 'config', {
            scope: 'e2e',
            path: 'e2e/csrf-rejected-delete-'+Date.now(),
            value: '1',
            type: 1
        });
        await AdminPanelSession.loginAsAdmin(page, gameConfig, longRun);
        await AdminPanelSession.expectRejectedPost(
            page,
            AdminPanelSession.adminPath(gameConfig)+'/config/delete',
            {form: {'ids[]': String(storedRow.id)}},
            'Entity delete without the token'
        );
        expect(
            (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'config', {id: storedRow.id})).length,
            'The rejected delete must keep the row'
        ).toBe(1);
        await screenshots.capture(page, 'delete-without-token-keeps-row');
    }

    static async runBulkDeleteTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let seededIds = [];
        for(let localeCode of TestAdminCsrfTokens.BULK_DELETE_LOCALES){
            seededIds.push((await E2eSeedAndRestoreApi.createRow(gameConfig, e2eGroup, 'locale', {
                locale: localeCode,
                language_code: [...localeCode.split('_')].shift(),
                country_code: [...localeCode.split('_')].pop(),
                enabled: 0
            })).id);
        }
        await AdminPanelSession.loginAsAdmin(page, gameConfig, longRun);
        await page.goto(AdminPanelSession.adminPath(gameConfig)+'/locale');
        for(let seededId of seededIds){
            await page.locator('.ids-checkbox[value="'+seededId+'"]').check();
        }
        await screenshots.capture(page, 'bulk-delete-rows-selected');
        await page.click('.list-delete-selection');
        await page.locator(Selectors.admin.dialogConfirm).filter({visible: true}).click();
        await AdminPanelSession.expectSuccessNotification(page, longRun);
        expect(
            await E2eSeedAndRestoreApi.loadRows(gameConfig, 'locale', {enabled: 0}),
            'Every selected row must be deleted'
        ).toEqual([]);
        await screenshots.capture(page, 'bulk-delete-rows-deleted');
    }

    static run()
    {
        test.describe('Admin CSRF Tokens', () => {
            test(
                'admin requests with a wrong CSRF token are rejected and change nothing',
                async ({ page, screenshots, gameConfig, longRun }) => {
                    await TestAdminCsrfTokens.runWrongTokenTest(page, screenshots, gameConfig, longRun);
                }
            );
            test(
                'admin request with the token of another administrator session is rejected',
                async ({ page, secondPage, screenshots, gameConfig, longRun }) => {
                    await TestAdminCsrfTokens.runOtherSessionTokenTest(page, secondPage, screenshots, gameConfig, longRun);
                }
            );
            test(
                'admin request with the token issued before the login is rejected',
                async ({ page, screenshots, gameConfig, longRun }) => {
                    await TestAdminCsrfTokens.runPreLoginTokenTest(page, screenshots, gameConfig, longRun);
                }
            );
            test(
                'admin logout over POST without the token keeps the session',
                async ({ page, screenshots, gameConfig, longRun }) => {
                    await TestAdminCsrfTokens.runLogoutWithoutTokenTest(page, screenshots, gameConfig, longRun);
                }
            );
            test(
                'admin entity delete without the token keeps the row',
                async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                    await TestAdminCsrfTokens.runDeleteWithoutTokenTest(page, screenshots, gameConfig, e2eGroup, longRun);
                }
            );
            test(
                'admin bulk delete sends the token and deletes every selected row',
                async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                    await TestAdminCsrfTokens.runBulkDeleteTest(page, screenshots, gameConfig, e2eGroup, longRun);
                }
            );
        });
    }

}

TestAdminCsrfTokens.run();
