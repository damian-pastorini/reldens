/**
 *
 * Reldens - Test Admin Security
 *
 * Tests the administration panel protections through the browser: the CSRF token sent by the login, the entity forms,
 * the upload forms and the upload routes, the session and token cookies, the login limiter and the banned
 * administrator.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { SecurityApi } = require('./helpers/security-api');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { GameConst } = require('../../lib/game/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAdminSecurity
{

    static adminPath(gameConfig)
    {
        return gameConfig.adminPath || '/reldens-admin';
    }

    static async openLogin(page, gameConfig, longRun)
    {
        await page.goto(TestAdminSecurity.adminPath(gameConfig)+'/login');
        await expect(page.locator(Selectors.admin.loginForm)).toBeVisible(
            { timeout: TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, longRun) }
        );
    }

    static async submitAdminLogin(page, gameConfig, longRun)
    {
        await TestAdminSecurity.openLogin(page, gameConfig, longRun);
        await page.locator(Selectors.admin.loginEmail).fill(gameConfig.adminUser || 'root@yourgame.com');
        await page.locator(Selectors.admin.loginPassword).fill(gameConfig.adminPassword || 'root');
        await page.click(Selectors.admin.loginSubmit);
        await page.waitForLoadState('networkidle');
    }

    static async loginAsAdmin(page, gameConfig, longRun)
    {
        await TestAdminSecurity.submitAdminLogin(page, gameConfig, longRun);
        await expect(page.locator(Selectors.admin.dashboard)).toBeVisible(
            { timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun) }
        );
    }

    static async fetchCookie(page, cookieName)
    {
        return (await page.context().cookies()).find((cookie) => cookieName === cookie.name);
    }

    static async fetchCsrfToken(page)
    {
        let csrfCookie = await TestAdminSecurity.fetchCookie(page, GameConst.ADMIN_CSRF_TOKEN_COOKIE);
        expect(csrfCookie, 'The CSRF token cookie must be set').toBeTruthy();
        return csrfCookie.value;
    }

    static async expectSuccessNotification(page, longRun)
    {
        await expect(page.locator(Selectors.admin.notificationSuccess)).toBeVisible(
            { timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun) }
        );
    }

    static async runLoginCookiesTest(page, screenshots, gameConfig, longRun)
    {
        await TestAdminSecurity.loginAsAdmin(page, gameConfig, longRun);
        await screenshots.capture(page, 'admin-dashboard');
        let sessionCookie = await TestAdminSecurity.fetchCookie(page, 'connect.sid');
        expect(sessionCookie, 'The session cookie must be set').toBeTruthy();
        expect(sessionCookie.httpOnly).toBe(true);
        expect(sessionCookie.sameSite).toBe('Lax');
        let csrfCookie = await TestAdminSecurity.fetchCookie(page, GameConst.ADMIN_CSRF_TOKEN_COOKIE);
        expect(csrfCookie, 'The CSRF token cookie must be set').toBeTruthy();
        expect(csrfCookie.httpOnly).toBe(false);
        expect(csrfCookie.sameSite).toBe('Strict');
        expect(csrfCookie.value.length).toBeGreaterThan(0);
    }

    static async runMissingTokenTest(page, gameConfig, longRun)
    {
        let adminPath = TestAdminSecurity.adminPath(gameConfig);
        await TestAdminSecurity.openLogin(page, gameConfig, longRun);
        let loginResponse = await page.request.post(adminPath+'/login', {
            form: {email: gameConfig.adminUser || 'root@yourgame.com', password: gameConfig.adminPassword || 'root'},
            maxRedirects: 0
        });
        expect(loginResponse.status()).toBe(403);
        await TestAdminSecurity.loginAsAdmin(page, gameConfig, longRun);
        let saveResponse = await page.request.post(adminPath+'/features/save', {
            form: {id: '1', code: 'chat', title: 'Chat', is_enabled: '1'},
            maxRedirects: 0
        });
        expect(saveResponse.status()).toBe(403);
    }

    static async runEntitySaveAndDeleteTest(page, screenshots, gameConfig, longRun)
    {
        let adminPath = TestAdminSecurity.adminPath(gameConfig);
        await TestAdminSecurity.loginAsAdmin(page, gameConfig, longRun);
        await page.goto(adminPath+'/config/edit');
        let editForm = page.locator(Selectors.admin.editForm);
        await editForm.locator('[name="scope"]').fill('e2e');
        await editForm.locator('[name="path"]').fill('e2e/csrf-delete-'+Date.now());
        await editForm.locator('[name="value"]').fill('1');
        await editForm.locator('select[name="type"]').selectOption('1');
        await screenshots.capture(page, 'config-row-filled');
        await page.click(Selectors.admin.saveButton);
        await TestAdminSecurity.expectSuccessNotification(page, longRun);
        expect(page.url()).toContain(adminPath+'/config/view');
        await page.click(Selectors.admin.deleteTopButton);
        await page.locator(Selectors.admin.dialogConfirm).filter({visible: true}).click();
        await TestAdminSecurity.expectSuccessNotification(page, longRun);
        await screenshots.capture(page, 'config-row-deleted');
    }

    static async runUploadEntitySaveTest(page, screenshots, gameConfig, longRun)
    {
        let adminPath = TestAdminSecurity.adminPath(gameConfig);
        await TestAdminSecurity.loginAsAdmin(page, gameConfig, longRun);
        await page.goto(adminPath+'/audio/edit?id=3');
        await expect(page.locator(Selectors.admin.editForm)).toHaveAttribute('enctype', 'multipart/form-data');
        await page.click(Selectors.admin.saveButton);
        await TestAdminSecurity.expectSuccessNotification(page, longRun);
        expect(page.url()).toContain(adminPath+'/audio/view');
        await screenshots.capture(page, 'upload-entity-saved');
    }

    static async runUploadRoutesTest(page, gameConfig, longRun)
    {
        let adminPath = TestAdminSecurity.adminPath(gameConfig);
        await TestAdminSecurity.loginAsAdmin(page, gameConfig, longRun);
        let csrfToken = await TestAdminSecurity.fetchCsrfToken(page);
        for(let uploadRoute of ['/objects-import', '/skills-import']){
            let rejectedResponse = await page.request.post(adminPath+uploadRoute, {
                multipart: {generatorData: '{}'},
                maxRedirects: 0
            });
            expect(rejectedResponse.status(), uploadRoute+' without the token').toBe(403);
            let acceptedResponse = await page.request.post(adminPath+uploadRoute, {
                multipart: {_csrf: csrfToken, generatorData: '{}'},
                maxRedirects: 0
            });
            expect(acceptedResponse.status(), uploadRoute+' with the token').toBe(302);
        }
    }

    static async runLoginLimiterTest(page, gameConfig, longRun)
    {
        let loginUrl = TestAdminSecurity.adminPath(gameConfig)+'/login';
        await TestAdminSecurity.openLogin(page, gameConfig, longRun);
        let failedLoginRequest = {
            form: {
                email: 'e2e-limit-'+Date.now()+'@yourgame.com',
                password: 'wrong-password',
                _csrf: await TestAdminSecurity.fetchCsrfToken(page)
            },
            maxRedirects: 0
        };
        let firstResponse = await page.request.post(loginUrl, failedLoginRequest);
        expect(firstResponse.status()).toBe(302);
        let remainingMatch = String(firstResponse.headers()['ratelimit']).match(/r=(\d+)/);
        expect(remainingMatch, 'The login limiter must report the remaining attempts').toBeTruthy();
        for(let remaining = Number([...remainingMatch].pop()); 0 < remaining; remaining--){
            let failedResponse = await page.request.post(loginUrl, failedLoginRequest);
            expect(failedResponse.status(), 'Failed login with '+remaining+' remaining').toBe(302);
        }
        let limitedResponse = await page.request.post(loginUrl, failedLoginRequest);
        expect(limitedResponse.status()).toBe(429);
    }

    static async runBannedAdministratorTest(page, screenshots, gameConfig, longRun)
    {
        let banResult = await SecurityApi.banUser(gameConfig, gameConfig.e2eUsername || 'root');
        expect(banResult.ok, 'The administrator account must exist to be banned').toBeTruthy();
        await TestAdminSecurity.submitAdminLogin(page, gameConfig, longRun);
        expect(page.url()).toContain('login-error=true');
        await expect(page.locator(Selectors.admin.dashboard)).toHaveCount(0);
        await screenshots.capture(page, 'banned-administrator-rejected');
    }

    static run()
    {
        test.describe('Admin Security', () => {
            test(
                'admin login sends the CSRF token and sets the session cookies',
                async ({ page, screenshots, gameConfig, longRun }) => {
                    await TestAdminSecurity.runLoginCookiesTest(page, screenshots, gameConfig, longRun);
                }
            );
            test('admin requests without the CSRF token are rejected', async ({ page, gameConfig, longRun }) => {
                await TestAdminSecurity.runMissingTokenTest(page, gameConfig, longRun);
            });
            test(
                'admin entity save and delete send the CSRF token',
                async ({ page, screenshots, gameConfig, longRun }) => {
                    await TestAdminSecurity.runEntitySaveAndDeleteTest(page, screenshots, gameConfig, longRun);
                }
            );
            test(
                'admin upload entity save sends the CSRF token',
                async ({ page, screenshots, gameConfig, longRun }) => {
                    await TestAdminSecurity.runUploadEntitySaveTest(page, screenshots, gameConfig, longRun);
                }
            );
            test(
                'admin upload routes check the CSRF token after the uploader',
                async ({ page, gameConfig, longRun }) => {
                    await TestAdminSecurity.runUploadRoutesTest(page, gameConfig, longRun);
                }
            );
            test('admin login limiter blocks after the allowed failures', async ({ page, gameConfig, longRun }) => {
                await TestAdminSecurity.runLoginLimiterTest(page, gameConfig, longRun);
            });
            test(
                'banned administrator can not log in',
                async ({ page, screenshots, gameConfig, longRun }) => {
                    await TestAdminSecurity.runBannedAdministratorTest(page, screenshots, gameConfig, longRun);
                }
            );
        });
    }

}

TestAdminSecurity.run();
