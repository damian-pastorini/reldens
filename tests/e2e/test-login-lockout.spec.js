/**
 *
 * Reldens - Test Login Lockout
 *
 * Tests the game login attempts lockout: the block ends with its time, a valid login clears the identity hits but not
 * the address hits, the identity and the address blocks are apart, the letter case and accent variants share one
 * identity, the disabled attempts, the guest and duplicate email failures, the administration failures, the sessions
 * already playing, the failures out of the window and the long usernames sharing the truncated identity.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { GameRoomJoin } = require('./helpers/game-room-join');
const { AdminPanelSession } = require('./helpers/admin-panel-session');
const { Login } = require('./helpers/login');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { DirectFormSubmit } = require('./helpers/direct-form-submit');
const { SecurityApi } = require('./helpers/security-api');
const { PlayerReset } = require('./helpers/player-reset');
const { Selectors } = require('./selectors');
const { GameConst } = require('../../lib/game/constants');
const { UsersConst } = require('../../lib/users/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestLoginLockout
{

    static ATTEMPTS_LIMIT = 3;
    static SHORT_TIME_MS = 1000;
    static IDENTITY_MAX_LENGTH = 255;

    static async expectLogin(gameConfig, username, host, expectedResult, label)
    {
        expect(await GameRoomJoin.login(gameConfig, username, gameConfig.e2ePassword, host), label).toEqual(expectedResult);
    }

    static async runBlockEndsTest(page, gameConfig)
    {
        await SecurityApi.updateSettings(gameConfig, {
            maxAttempts: TestLoginLockout.ATTEMPTS_LIMIT,
            blockTimeMs: TestLoginLockout.SHORT_TIME_MS
        });
        await GameRoomJoin.failLogins(gameConfig, Array(TestLoginLockout.ATTEMPTS_LIMIT).fill(gameConfig.e2eUsername));
        await TestLoginLockout.expectLogin(gameConfig, gameConfig.e2eUsername, GameRoomJoin.IPV4_HOST, GameRoomJoin.REJECTED, 'Blocked');
        await page.waitForTimeout(TestLoginLockout.SHORT_TIME_MS);
        await TestLoginLockout.expectLogin(gameConfig, gameConfig.e2eUsername, GameRoomJoin.IPV4_HOST, GameRoomJoin.ACCEPTED, 'Ended');
    }

    static async runValidLoginClearsIdentityTest(gameConfig)
    {
        let username = gameConfig.e2eUsername;
        await SecurityApi.updateSettings(gameConfig, {maxAttempts: TestLoginLockout.ATTEMPTS_LIMIT});
        await GameRoomJoin.failLogins(gameConfig, [username, username]);
        expect(await SecurityApi.fetchIdentityHits(gameConfig, username), 'Counted failures').toBe(2);
        await TestLoginLockout.expectLogin(gameConfig, username, GameRoomJoin.IPV4_HOST, GameRoomJoin.ACCEPTED, 'Valid');
        expect(await SecurityApi.fetchIdentityHits(gameConfig, username), 'Cleared identity hits').toBe(0);
        await GameRoomJoin.failLogins(gameConfig, [username]);
        expect(await SecurityApi.fetchIdentityState(gameConfig, username)).toEqual({hits: 1, blocked: false});
        await TestLoginLockout.expectLogin(gameConfig, username, GameRoomJoin.IPV4_HOST, GameRoomJoin.REJECTED, 'Address');
        await TestLoginLockout.expectLogin(gameConfig, gameConfig.e2eUsername2, GameRoomJoin.IPV4_HOST, GameRoomJoin.REJECTED, 'Other');
    }

    static async runIdentityBlockApartTest(gameConfig)
    {
        await SecurityApi.updateSettings(gameConfig, {maxAttempts: TestLoginLockout.ATTEMPTS_LIMIT});
        await GameRoomJoin.failLogins(
            gameConfig,
            Array(TestLoginLockout.ATTEMPTS_LIMIT).fill(gameConfig.e2eUsername),
            GameRoomJoin.IPV6_HOST
        );
        await TestLoginLockout.expectLogin(gameConfig, gameConfig.e2eUsername, GameRoomJoin.IPV4_HOST, GameRoomJoin.REJECTED, 'Identity');
        await TestLoginLockout.expectLogin(gameConfig, gameConfig.e2eUsername2, GameRoomJoin.IPV4_HOST, GameRoomJoin.ACCEPTED, 'Free');
        await TestLoginLockout.expectLogin(gameConfig, gameConfig.e2eUsername2, GameRoomJoin.IPV6_HOST, GameRoomJoin.REJECTED, 'Address');
    }

    static async runIdentityVariantsTest(gameConfig)
    {
        let username = gameConfig.e2eUsername;
        let variants = [username.toUpperCase(), username.charAt(0).toUpperCase()+username.slice(1)];
        let accentVariant = username.replace('o', 'ö');
        await SecurityApi.updateSettings(gameConfig, {maxAttempts: TestLoginLockout.ATTEMPTS_LIMIT + 1});
        await GameRoomJoin.failLogins(gameConfig, variants);
        await GameRoomJoin.failLogins(gameConfig, [accentVariant], GameRoomJoin.IPV6_HOST);
        expect(await SecurityApi.fetchIdentityHits(gameConfig, username), 'Shared identity hits').toBe(
            TestLoginLockout.ATTEMPTS_LIMIT
        );
        await GameRoomJoin.failLogins(gameConfig, [accentVariant.toUpperCase()], GameRoomJoin.IPV6_HOST);
        expect((await SecurityApi.fetchIdentityState(gameConfig, username)).blocked, 'Shared identity block').toBe(true);
        await TestLoginLockout.expectLogin(gameConfig, username, GameRoomJoin.IPV4_HOST, GameRoomJoin.REJECTED, 'Blocked');
        await TestLoginLockout.expectLogin(gameConfig, gameConfig.e2eUsername2, GameRoomJoin.IPV4_HOST, GameRoomJoin.ACCEPTED, 'Free');
    }

    static async runDisabledAttemptsTest(gameConfig)
    {
        await SecurityApi.updateSettings(gameConfig, {maxAttempts: 1, loginAttemptsEnabled: false});
        await GameRoomJoin.failLogins(gameConfig, Array(TestLoginLockout.ATTEMPTS_LIMIT).fill(gameConfig.e2eUsername));
        expect(await SecurityApi.fetchIdentityState(gameConfig, gameConfig.e2eUsername)).toEqual({hits: 0, blocked: false});
        await TestLoginLockout.expectLogin(gameConfig, gameConfig.e2eUsername, GameRoomJoin.IPV4_HOST, GameRoomJoin.ACCEPTED, 'Free');
    }

    static async runGuestAndDuplicateEmailTest(gameConfig)
    {
        await SecurityApi.updateSettings(gameConfig, {maxAttempts: TestLoginLockout.ATTEMPTS_LIMIT});
        let guestJoin = {isGuest: true, isNewUser: true, username: DirectFormSubmit.createUniqueName()};
        expect(await GameRoomJoin.join(gameConfig, guestJoin, GameRoomJoin.IPV6_HOST), 'New guest').toEqual(GameRoomJoin.ACCEPTED);
        let guests = await E2eSeedAndRestoreApi.loadRows(gameConfig, 'users', {origin: UsersConst.ORIGINS.GUEST});
        let guestUsername = guests.reduce((latest, guest) => guest.id > latest.id ? guest : latest).username;
        let guestLogin = {isGuest: true, username: guestUsername, password: GameRoomJoin.WRONG_PASSWORD};
        expect(await GameRoomJoin.join(gameConfig, guestLogin, GameRoomJoin.IPV6_HOST), 'Guest').toEqual(GameRoomJoin.REJECTED);
        let rootUser = (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'users', {username: gameConfig.e2eUsername})).shift();
        let duplicatedEmail = DirectFormSubmit.createRegistration(
            DirectFormSubmit.createUniqueName(),
            rootUser.email,
            DirectFormSubmit.VALID_PASSWORD
        );
        let duplicatedRegistration = Object.assign(duplicatedEmail, {isNewUser: true});
        expect(await GameRoomJoin.join(gameConfig, duplicatedRegistration, GameRoomJoin.IPV6_HOST), 'Email').toEqual(
            GameRoomJoin.REJECTED
        );
        await GameRoomJoin.failLogins(gameConfig, [gameConfig.e2eUsername], GameRoomJoin.IPV6_HOST);
        await TestLoginLockout.expectLogin(gameConfig, gameConfig.e2eUsername2, GameRoomJoin.IPV6_HOST, GameRoomJoin.REJECTED, 'Blocked');
        await TestLoginLockout.expectLogin(gameConfig, gameConfig.e2eUsername2, GameRoomJoin.IPV4_HOST, GameRoomJoin.ACCEPTED, 'Free');
    }

    static async runAdminFailuresBlockGameTest(page, screenshots, gameConfig, longRun)
    {
        await SecurityApi.updateSettings(gameConfig, {maxAttempts: TestLoginLockout.ATTEMPTS_LIMIT});
        for(let attempt = 1; TestLoginLockout.ATTEMPTS_LIMIT >= attempt; attempt++){
            let unknownEmail = 'e2e-unknown-'+attempt+'-'+Date.now()+'@yourgame.com';
            let response = await AdminPanelSession.postLogin(page, gameConfig, longRun, unknownEmail, GameRoomJoin.WRONG_PASSWORD);
                expect(response.status(), 'Admin failure '+attempt).toBe(302);
        }
        expect(await Login.submitLoginExpectingError(page, gameConfig.e2eUsername, gameConfig.e2ePassword, longRun)).toBe(
            GameConst.INVALID_LOGIN_MESSAGE
        );
        await screenshots.capture(page, 'game-login-blocked-by-admin-failures');
    }

    static async runPlayingSessionKeptTest(page, secondPage, gameConfig, longRun)
    {
        await Login.loginRootPlayer(secondPage, gameConfig, longRun, '2');
        await SecurityApi.updateSettings(gameConfig, {maxAttempts: TestLoginLockout.ATTEMPTS_LIMIT});
        for(let attempt = 1; TestLoginLockout.ATTEMPTS_LIMIT >= attempt; attempt++){
            await Login.submitLoginExpectingError(page, gameConfig.e2eUsername, GameRoomJoin.WRONG_PASSWORD, longRun);
        }
        expect(await Login.submitLoginExpectingError(page, gameConfig.e2eUsername, gameConfig.e2ePassword, longRun)).toBe(
            GameConst.INVALID_LOGIN_MESSAGE
        );
        await page.waitForTimeout(TestLoginLockout.SHORT_TIME_MS);
        expect(await secondPage.evaluate(() => window.reldens.activeRoomEvents.room.connection.isOpen)).toBe(true);
        await expect(secondPage.locator(Selectors.reloadModal.container), 'No modal for the playing session').toHaveCount(0);
        let playingPlayer = await GameplayE2eStateApi.fetchPlayer(gameConfig, Login.TOWN_ROOM_NAME, gameConfig.e2ePlayerName2);
        expect(playingPlayer.inState, 'The player must stay in the room').toBe(GameConst.STATUS.ACTIVE);
    }

    static async runWindowEndedFailuresTest(page, gameConfig)
    {
        await SecurityApi.updateSettings(gameConfig, {maxAttempts: 2, windowMs: TestLoginLockout.SHORT_TIME_MS});
        await GameRoomJoin.failLogins(gameConfig, [gameConfig.e2eUsername]);
        await page.waitForTimeout(TestLoginLockout.SHORT_TIME_MS);
        await GameRoomJoin.failLogins(gameConfig, [gameConfig.e2eUsername]);
        expect(await SecurityApi.fetchIdentityState(gameConfig, gameConfig.e2eUsername)).toEqual({hits: 1, blocked: false});
        await TestLoginLockout.expectLogin(gameConfig, gameConfig.e2eUsername, GameRoomJoin.IPV4_HOST, GameRoomJoin.ACCEPTED, 'Free');
    }

    static async runLongUsernameTest(gameConfig)
    {
        let sharedPrefix = 'e2e'.padEnd(TestLoginLockout.IDENTITY_MAX_LENGTH, 'x');
        await SecurityApi.updateSettings(gameConfig, {maxAttempts: 2});
        await GameRoomJoin.failLogins(gameConfig, [sharedPrefix+'1']);
        expect(await SecurityApi.fetchIdentityHits(gameConfig, sharedPrefix+'2'), 'Shared truncated key').toBe(1);
        await GameRoomJoin.failLogins(gameConfig, [sharedPrefix+'2'], GameRoomJoin.IPV6_HOST);
        expect((await SecurityApi.fetchIdentityState(gameConfig, sharedPrefix+'3')).blocked, 'Truncated key block').toBe(true);
    }

    static run()
    {
        test.describe('Login Lockout', () => {
            test.beforeEach(async ({ gameConfig, e2eGroup }) => {
                await PlayerReset.resetAll(gameConfig, e2eGroup);
            });
            test('block ends after its time and the valid login works again', async ({ page, gameConfig }) => {
                await TestLoginLockout.runBlockEndsTest(page, gameConfig);
            });
            test('valid login clears the identity hits and keeps the address hits', async ({ gameConfig }) => {
                await TestLoginLockout.runValidLoginClearsIdentityTest(gameConfig);
            });
            test('identity block applies from another address apart from the address block', async ({ gameConfig }) => {
                await TestLoginLockout.runIdentityBlockApartTest(gameConfig);
            });
            test('letter case and accent variants share one identity lockout', async ({ gameConfig }) => {
                await TestLoginLockout.runIdentityVariantsTest(gameConfig);
            });
            test('disabled login attempts count no failure and set no block', async ({ gameConfig }) => {
                await TestLoginLockout.runDisabledAttemptsTest(gameConfig);
            });
            test('failed guest login and duplicate email registration count toward the lockout', async ({ gameConfig }) => {
                await TestLoginLockout.runGuestAndDuplicateEmailTest(gameConfig);
            });
            test('administration failures block the game login of the address', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestLoginLockout.runAdminFailuresBlockGameTest(page, screenshots, gameConfig, longRun);
            });
            test('blocked login keeps the sessions of the address already playing', async ({ page, secondPage, gameConfig, longRun }) => {
                await TestLoginLockout.runPlayingSessionKeptTest(page, secondPage, gameConfig, longRun);
            });
            test('failures out of the window are not counted', async ({ page, gameConfig }) => {
                await TestLoginLockout.runWindowEndedFailuresTest(page, gameConfig);
            });
            test('usernames over the identity length share the truncated key and its block', async ({ gameConfig }) => {
                await TestLoginLockout.runLongUsernameTest(gameConfig);
            });
        });
    }

}

TestLoginLockout.run();
