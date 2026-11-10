/**
 *
 * Reldens - Test Authentication Access
 *
 * Tests who can register or play as a guest: the forms hidden by the client config, the requests the server rejects
 * when the registration or the guests were turned off with the form already open, the sanitized guest names, the stored
 * role, status and origin of the new accounts, the storage failure, two concurrent registrations and the guest
 * credentials before and after the guest session ended.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { DirectFormSubmit } = require('./helpers/direct-form-submit');
const { InitialClientConfig } = require('./helpers/initial-client-config');
const { Login } = require('./helpers/login');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { SecurityApi } = require('./helpers/security-api');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { UsersConst } = require('../../lib/users/constants');
const { GameConst } = require('../../lib/game/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAuthenticationAccess
{

    static SESSION_END_WAIT_MS = 1000;
    static GUEST_EMAIL_DOMAIN = '@e2e-guest.test';

    static createAccountValues()
    {
        let account = {username: DirectFormSubmit.createUniqueName()};
        account.email = account.username+'@yourgame.com';
        return account;
    }

    static async fetchGuestsCount(gameConfig)
    {
        return (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'users', {origin: UsersConst.ORIGINS.GUEST})).length;
    }

    static async fetchInitialGameValues(page)
    {
        return await page.evaluate(() => ({
            username: window.reldens.initialGameData.userName,
            password: window.reldens.initialGameData.guestPassword
        }));
    }

    static async enterGuestToSelection(page, longRun)
    {
        await DirectFormSubmit.openPage(page);
        await page.click(Selectors.login.guestSubmit);
        await DirectFormSubmit.expectPlayerSelection(page, longRun, 'The guest must reach the selection');
        return await TestAuthenticationAccess.fetchInitialGameValues(page);
    }

    static async endGuestSession(page)
    {
        await page.goto('about:blank');
        await page.waitForTimeout(TestAuthenticationAccess.SESSION_END_WAIT_MS);
    }

    static async runRegistrationFormsHiddenTest(page, screenshots, gameConfig)
    {
        await SecurityApi.setMailerEnabled(gameConfig, true);
        await InitialClientConfig.override(page, 'client/general/users/allowRegistration', false);
        await DirectFormSubmit.openPage(page);
        await expect(page.locator(Selectors.register.form)).toBeHidden();
        await expect(page.locator(Selectors.forgot.form)).toBeHidden();
        await expect(page.locator(Selectors.login.form), 'The login form must stay').toBeVisible();
        await screenshots.capture(page, 'registration-forms-hidden');
    }

    static async runGuestFormHiddenTest(page, screenshots, override, screenshotName)
    {
        await InitialClientConfig.override(page, override.configPath, override.value);
        await DirectFormSubmit.openPage(page);
        await expect(page.locator(Selectors.login.guestForm)).toBeHidden();
        await expect(page.locator(Selectors.login.form), 'The login form must stay').toBeVisible();
        await screenshots.capture(page, screenshotName);
    }

    static async runRegistrationTurnedOffTest(page, screenshots, gameConfig, longRun)
    {
        let account = TestAuthenticationAccess.createAccountValues();
        await DirectFormSubmit.openPage(page);
        await SecurityApi.updateSettings(gameConfig, {allowRegistration: false});
        await DirectFormSubmit.startGame(
            page,
            DirectFormSubmit.createRegistration(account.username, account.email, DirectFormSubmit.VALID_PASSWORD),
            true
        );
        await DirectFormSubmit.expectFormError(page, Selectors.registerResponse.error, longRun, 'Registration off');
        expect(await E2eSeedAndRestoreApi.loadRows(gameConfig, 'users', {email: account.email})).toEqual([]);
        await screenshots.capture(page, 'registration-turned-off');
    }

    static async runGuestTurnedOffTest(page, screenshots, gameConfig, longRun)
    {
        let guestsBefore = await TestAuthenticationAccess.fetchGuestsCount(gameConfig);
        await DirectFormSubmit.openPage(page);
        await SecurityApi.updateSettings(gameConfig, {allowGuest: false});
        await page.click(Selectors.login.guestSubmit);
        await DirectFormSubmit.expectFormError(page, Selectors.guest.error, longRun, 'Guests off');
        expect(await TestAuthenticationAccess.fetchGuestsCount(gameConfig), 'No guest must be created').toBe(guestsBefore);
        await screenshots.capture(page, 'guest-turned-off');
    }

    static async runGuestNameSanitizedTest(page, screenshots, gameConfig, longRun)
    {
        await SecurityApi.updateSettings(gameConfig, {allowGuestUserName: true});
        let namesCases = [
            {enteredName: 'Ab c!<>-9', expectedSuffix: '-Abc-9'},
            {enteredName: 'x'.repeat(30), expectedSuffix: '-'+'x'.repeat(20)}
        ];
        for(let nameCase of namesCases){
            await DirectFormSubmit.submit(page, {
                formId: DirectFormSubmit.GUEST_FORM_ID,
                username: nameCase.enteredName,
                password: nameCase.enteredName,
                rePassword: nameCase.enteredName,
                isGuest: true
            }, true);
            await DirectFormSubmit.expectPlayerSelection(page, longRun, nameCase.enteredName);
            let guestValues = await TestAuthenticationAccess.fetchInitialGameValues(page);
            expect(guestValues.username.startsWith('guest-'), guestValues.username).toBe(true);
            expect(guestValues.username.endsWith(nameCase.expectedSuffix), guestValues.username).toBe(true);
        }
        await screenshots.capture(page, 'guest-name-sanitized');
    }

    static async runGuestStoredValuesTest(page, screenshots, gameConfig, longRun)
    {
        await SecurityApi.updateSettings(gameConfig, {guestEmailDomain: TestAuthenticationAccess.GUEST_EMAIL_DOMAIN});
        let guestValues = await TestAuthenticationAccess.enterGuestToSelection(page, longRun);
        let storedGuest = (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'users', {username: guestValues.username})).shift();
        let guestRoleId = await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, 'server/players/guestUser/roleId');
        expect(storedGuest.email).toBe(guestValues.username+TestAuthenticationAccess.GUEST_EMAIL_DOMAIN);
        expect(storedGuest.role_id).toBe(Number(guestRoleId));
        expect(storedGuest.origin).toBe(UsersConst.ORIGINS.GUEST);
        await screenshots.capture(page, 'guest-stored-values');
    }

    static async runNewAccountStoredValuesTest(page, screenshots, gameConfig, longRun)
    {
        let account = TestAuthenticationAccess.createAccountValues();
        await DirectFormSubmit.submit(
            page,
            DirectFormSubmit.createRegistration(account.username, account.email, DirectFormSubmit.VALID_PASSWORD),
            true
        );
        await DirectFormSubmit.expectPlayerSelection(page, longRun, 'The new account');
        let storedUser = (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'users', {email: account.email})).shift();
        let initialRoleId = await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, 'server/players/initialUser/roleId');
        let initialStatus = await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, 'server/players/initialUser/status');
        expect(storedUser.role_id).toBe(Number(initialRoleId));
        expect(String(storedUser.status)).toBe(String(initialStatus));
        expect(storedUser.origin).toBe(UsersConst.ORIGINS.REGISTRATION);
        await screenshots.capture(page, 'new-account-stored-values');
    }

    static async runRegistrationStorageFailureTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let account = TestAuthenticationAccess.createAccountValues();
        await E2eSeedAndRestoreApi.overrideConfig(gameConfig, e2eGroup, 'server/players/initialUser/status', null);
        await DirectFormSubmit.submit(
            page,
            DirectFormSubmit.createRegistration(account.username, account.email, DirectFormSubmit.VALID_PASSWORD),
            true
        );
        await DirectFormSubmit.expectFormError(page, Selectors.registerResponse.error, longRun, 'Storage failure');
        expect(await E2eSeedAndRestoreApi.loadRows(gameConfig, 'users', {email: account.email})).toEqual([]);
        await screenshots.capture(page, 'registration-storage-failure');
    }

    static async fetchRegistrationOutcomes(pages)
    {
        let outcomes = {selected: 0, rejected: 0};
        for(let page of pages){
            outcomes.selected += await page.locator(DirectFormSubmit.VISIBLE_SELECTION).count();
            outcomes.rejected += await page.locator(Selectors.registerResponse.error+':not(:empty)').count();
        }
        return outcomes;
    }

    static async runConcurrentRegistrationsTest(page, secondPage, screenshots, gameConfig, longRun)
    {
        let email = DirectFormSubmit.createUniqueName()+'@yourgame.com';
        await DirectFormSubmit.openPage(page);
        await DirectFormSubmit.openPage(secondPage);
        await Promise.all([page, secondPage].map((requestPage, pageIndex) => DirectFormSubmit.startGame(
            requestPage,
            DirectFormSubmit.createRegistration(
                DirectFormSubmit.createUniqueName()+'n'+pageIndex,
                email,
                DirectFormSubmit.VALID_PASSWORD
            ),
            true
        )));
        await expect.poll(
            async () => await TestAuthenticationAccess.fetchRegistrationOutcomes([page, secondPage]),
            {timeout: TimeConstants.forLongRun(TimeConstants.CHARACTER_SCREEN, longRun)}
        ).toEqual({selected: 1, rejected: 1});
        expect((await E2eSeedAndRestoreApi.loadRows(gameConfig, 'users', {email})).length, 'One account').toBe(1);
        await screenshots.capture(page, 'concurrent-registrations');
    }

    static async runGuestActiveLoginTest(page, secondPage, screenshots, longRun)
    {
        let guestValues = await TestAuthenticationAccess.enterGuestToSelection(page, longRun);
        await Login.loginToSelection(secondPage, guestValues.username, guestValues.password, longRun);
        await screenshots.capture(secondPage, 'guest-active-credentials-accepted');
    }

    static async runGuestEndedLoginTest(page, secondPage, screenshots, gameConfig, longRun)
    {
        let guestValues = await TestAuthenticationAccess.enterGuestToSelection(page, longRun);
        await TestAuthenticationAccess.endGuestSession(page);
        await Login.submitLoginExpectingError(secondPage, guestValues.username, guestValues.password, longRun);
        expect(await SecurityApi.fetchIdentityHits(gameConfig, guestValues.username), 'A counted failure').toBe(1);
        await screenshots.capture(secondPage, 'guest-ended-credentials-rejected');
    }

    static async runGuestReloadTest(page, screenshots, longRun)
    {
        let guestValues = await TestAuthenticationAccess.enterGuestToSelection(page, longRun);
        await page.reload();
        await expect(page.locator(Selectors.login.form), 'The reload must go back to the forms').toBeVisible({
            timeout: TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, longRun)
        });
        await page.waitForTimeout(TestAuthenticationAccess.SESSION_END_WAIT_MS);
        await Login.submitLoginExpectingError(page, guestValues.username, guestValues.password, longRun);
        await screenshots.capture(page, 'guest-reload-cannot-return');
    }

    static async runGuestRoleNotConfiguredTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun)
    {
        let guestValues = await TestAuthenticationAccess.enterGuestToSelection(page, longRun);
        await TestAuthenticationAccess.endGuestSession(page);
        await E2eSeedAndRestoreApi.overrideConfig(gameConfig, e2eGroup, 'server/players/guestUser/roleId', 0);
        await Login.loginToSelection(secondPage, guestValues.username, guestValues.password, longRun);
        await screenshots.capture(secondPage, 'guest-role-not-configured');
    }

    static async runForgedGuestFlagTest(page, screenshots, gameConfig)
    {
        await DirectFormSubmit.openPage(page);
        let joinResult = await page.evaluate(async (joinData) => {
            window.reldens.initializeClient();
            return {
                joined: Boolean(await window.reldens.gameClient.joinOrCreate(joinData.roomName, joinData.userData)),
                error: window.reldens.gameClient.lastErrorMessage
            };
        }, {
            roomName: GameConst.ROOM_GAME,
            userData: {isGuest: true, username: gameConfig.e2eUsername, password: gameConfig.e2ePassword}
        });
        expect(joinResult.joined, 'The forged flag must be rejected').toBe(false);
        expect(joinResult.error).toBe(GameConst.INVALID_LOGIN_MESSAGE);
        expect(await SecurityApi.fetchIdentityHits(gameConfig, gameConfig.e2eUsername), 'A counted failure').toBe(1);
        await screenshots.capture(page, 'forged-guest-flag-rejected');
    }

    static run()
    {
        test.describe('Authentication Access', () => {
            test('registration off hides the register and forgot forms', async ({ page, screenshots, gameConfig }) => {
                await TestAuthenticationAccess.runRegistrationFormsHiddenTest(page, screenshots, gameConfig);
            });
            test('guests off hides the guest form', async ({ page, screenshots }) => {
                await TestAuthenticationAccess.runGuestFormHiddenTest(
                    page,
                    screenshots,
                    {configPath: 'client/general/users/allowGuest', value: false},
                    'guest-form-hidden-guests-off'
                );
            });
            test('no guest rooms hides the guest form', async ({ page, screenshots }) => {
                await TestAuthenticationAccess.runGuestFormHiddenTest(
                    page,
                    screenshots,
                    {configPath: 'client/rooms/selection/availableRooms/registrationGuest', value: {}},
                    'guest-form-hidden-no-rooms'
                );
            });
            test('registration turned off with the form open is rejected', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAuthenticationAccess.runRegistrationTurnedOffTest(page, screenshots, gameConfig, longRun);
            });
            test('guests turned off with the form open is rejected', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAuthenticationAccess.runGuestTurnedOffTest(page, screenshots, gameConfig, longRun);
            });
            test('guest name is sanitized into the generated name', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAuthenticationAccess.runGuestNameSanitizedTest(page, screenshots, gameConfig, longRun);
            });
            test('guest account stores its role, email domain and origin', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAuthenticationAccess.runGuestStoredValuesTest(page, screenshots, gameConfig, longRun);
            });
            test('new account stores the configured role, status and origin', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAuthenticationAccess.runNewAccountStoredValuesTest(page, screenshots, gameConfig, longRun);
            });
            test('registration storage failure shows the invalid login', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAuthenticationAccess.runRegistrationStorageFailureTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('concurrent registrations with one email create one account', async ({ page, secondPage, screenshots, gameConfig, longRun }) => {
                await TestAuthenticationAccess.runConcurrentRegistrationsTest(page, secondPage, screenshots, gameConfig, longRun);
            });
            test('guest credentials are accepted while the guest is active', async ({ page, secondPage, screenshots, longRun }) => {
                await TestAuthenticationAccess.runGuestActiveLoginTest(page, secondPage, screenshots, longRun);
            });
            test('guest credentials are rejected after the session ended', async ({ page, secondPage, screenshots, gameConfig, longRun }) => {
                await TestAuthenticationAccess.runGuestEndedLoginTest(page, secondPage, screenshots, gameConfig, longRun);
            });
            test('guest reloading the page cannot return to the account', async ({ page, screenshots, longRun }) => {
                await TestAuthenticationAccess.runGuestReloadTest(page, screenshots, longRun);
            });
            test('guest role not configured skips the active check', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAuthenticationAccess.runGuestRoleNotConfiguredTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('forged guest flag on a regular account is rejected', async ({ page, screenshots, gameConfig }) => {
                await TestAuthenticationAccess.runForgedGuestFlagTest(page, screenshots, gameConfig);
            });
        });
    }

}

TestAuthenticationAccess.run();
