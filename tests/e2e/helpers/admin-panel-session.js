/**
 *
 * Reldens - Admin Panel Session
 *
 * The administration panel steps shared by the admin specs: the panel path, the login form, the login through the
 * browser, the session and token cookies and the success notification of a saved or deleted row.
 *
 */

const { expect } = require('@playwright/test');
const { TimeConstants } = require('./time-constants');
const { E2eSeedAndRestoreApi } = require('./e2e-seed-and-restore-api');
const { Selectors } = require('../selectors');
const { GameConst } = require('../../../lib/game/constants');

class AdminPanelSession
{

    static adminPath(gameConfig)
    {
        return gameConfig.adminPath || '/reldens-admin';
    }

    static async openLogin(page, gameConfig, longRun)
    {
        await page.goto(AdminPanelSession.adminPath(gameConfig)+'/login');
        await expect(page.locator(Selectors.admin.loginForm)).toBeVisible(
            { timeout: TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, longRun) }
        );
    }

    static async submitAdminLogin(
        page,
        gameConfig,
        longRun,
        email = gameConfig.adminUser || 'root@yourgame.com',
        password = gameConfig.adminPassword || 'root'
    ){
        await AdminPanelSession.openLogin(page, gameConfig, longRun);
        await page.locator(Selectors.admin.loginEmail).fill(email);
        await page.locator(Selectors.admin.loginPassword).fill(password);
        await page.click(Selectors.admin.loginSubmit);
        await page.waitForLoadState('networkidle');
    }

    static async loginAsAdmin(page, gameConfig, longRun, email, password)
    {
        await AdminPanelSession.submitAdminLogin(page, gameConfig, longRun, email, password);
        await expect(page.locator(Selectors.admin.dashboard)).toBeVisible(
            { timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun) }
        );
    }

    static async seedUser(gameConfig, e2eGroup, roleId = 0)
    {
        let rootUser = [
            ...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'users', {username: gameConfig.e2eUsername})
        ].shift();
        let uniqueKey = 'e2eadmin'+Date.now();
        return await E2eSeedAndRestoreApi.createRow(gameConfig, e2eGroup, 'users', {
            email: uniqueKey+'@yourgame.com',
            username: uniqueKey,
            password: rootUser.password,
            role_id: roleId || rootUser.role_id,
            status: rootUser.status
        });
    }

    static async fetchSessionId(page)
    {
        let sessionCookie = await AdminPanelSession.fetchCookie(page, 'connect.sid');
        expect(sessionCookie, 'The session cookie must be set').toBeTruthy();
        return [...decodeURIComponent(sessionCookie.value).slice(2).split('.')].shift();
    }

    static async expectLoggedOut(page, longRun)
    {
        await page.reload();
        await expect(page.locator(Selectors.admin.loginForm), 'The session must be ended').toBeVisible(
            { timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun) }
        );
    }

    static async expectLoggedIn(page, gameConfig, longRun)
    {
        await page.goto(AdminPanelSession.adminPath(gameConfig));
        await expect(page.locator(Selectors.admin.dashboard), 'The session must be kept').toBeVisible(
            { timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun) }
        );
    }

    static async fetchCookie(page, cookieName)
    {
        return (await page.context().cookies()).find((cookie) => cookieName === cookie.name);
    }

    static async fetchCsrfToken(page)
    {
        let csrfCookie = await AdminPanelSession.fetchCookie(page, GameConst.ADMIN_CSRF_TOKEN_COOKIE);
        expect(csrfCookie, 'The CSRF token cookie must be set').toBeTruthy();
        return csrfCookie.value;
    }

    static async postLogin(page, gameConfig, longRun, email, password)
    {
        await AdminPanelSession.openLogin(page, gameConfig, longRun);
        return await page.request.post(AdminPanelSession.adminPath(gameConfig)+'/login', {
            form: {email, password, _csrf: await AdminPanelSession.fetchCsrfToken(page)},
            maxRedirects: 0
        });
    }

    static async expectRejectedPost(requestPage, url, requestOptions, label)
    {
        let response = await requestPage.request.post(url, Object.assign({maxRedirects: 0}, requestOptions));
        expect(response.status(), label).toBe(403);
    }

    static async expectSuccessNotification(page, longRun)
    {
        await expect(page.locator(Selectors.admin.notificationSuccess)).toBeVisible(
            { timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun) }
        );
    }

}

module.exports.AdminPanelSession = AdminPanelSession;
