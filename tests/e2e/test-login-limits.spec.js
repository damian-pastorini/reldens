/**
 *
 * Reldens - Test Login Limits
 *
 * Tests the per address limits of the registrations, the guests and the joins: each limit ends with its window, 0
 * disables it and it only limits its own address, the invalid registrations do not consume it, the joins limit counts
 * every username of the address and every address of the username, and the rooms joins limit applies to the scene and
 * feature rooms.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { GameRoomJoin } = require('./helpers/game-room-join');
const { DirectFormSubmit } = require('./helpers/direct-form-submit');
const { Login } = require('./helpers/login');
const { PlayerReset } = require('./helpers/player-reset');
const { SecurityApi } = require('./helpers/security-api');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { GameConst } = require('../../lib/game/constants');
const { ChatConst } = require('../../lib/chat/constants');
const GameTranslations = require('../../lib/game/client/snippets/en_US');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestLoginLimits
{

    static SHORT_WINDOW_MS = 1000;

    static async register(gameConfig, nameSuffix, host, email = '')
    {
        return await GameRoomJoin.register(gameConfig, GameRoomJoin.createAccount(nameSuffix, email), host);
    }

    static async joinGuest(gameConfig, host)
    {
        return await GameRoomJoin.join(gameConfig, {isGuest: true, isNewUser: true, username: 'e2eguest'}, host);
    }

    static async expectLogins(gameConfig, usernames, host, expectedResult)
    {
        for(let username of usernames){
            expect(await GameRoomJoin.login(gameConfig, username, gameConfig.e2ePassword, host), username).toEqual(expectedResult);
        }
    }

    static async runRegistrationLimitTest(page, gameConfig)
    {
        await SecurityApi.updateSettings(gameConfig, {registrationMaxPerIp: 1, windowMs: TestLoginLimits.SHORT_WINDOW_MS});
        expect(await TestLoginLimits.register(gameConfig, 'a', GameRoomJoin.IPV4_HOST), 'First').toEqual(GameRoomJoin.ACCEPTED);
        expect(await TestLoginLimits.register(gameConfig, 'b', GameRoomJoin.IPV4_HOST), 'Limited').toEqual(GameRoomJoin.REJECTED);
        expect(await TestLoginLimits.register(gameConfig, 'c', GameRoomJoin.IPV6_HOST), 'Other address').toEqual(
            GameRoomJoin.ACCEPTED
        );
        await page.waitForTimeout(TestLoginLimits.SHORT_WINDOW_MS);
        expect(await TestLoginLimits.register(gameConfig, 'd', GameRoomJoin.IPV4_HOST), 'Window ended').toEqual(
            GameRoomJoin.ACCEPTED
        );
        await SecurityApi.updateSettings(gameConfig, {registrationMaxPerIp: 0});
        for(let nameSuffix of ['e', 'f']){
            expect(await TestLoginLimits.register(gameConfig, nameSuffix, GameRoomJoin.IPV4_HOST), 'Disabled').toEqual(
                GameRoomJoin.ACCEPTED
            );
        }
    }

    static async runInvalidRegistrationTest(gameConfig)
    {
        await SecurityApi.updateSettings(gameConfig, {registrationMaxPerIp: 1});
        let invalidUsername = DirectFormSubmit.createRegistration('e2e!bad', 'e2e-bad-name@yourgame.com', DirectFormSubmit.VALID_PASSWORD);
        expect(await GameRoomJoin.join(gameConfig, Object.assign(invalidUsername, {isNewUser: true})), 'Username').toEqual(
            GameRoomJoin.REJECTED
        );
        expect(await TestLoginLimits.register(gameConfig, 'g', GameRoomJoin.IPV4_HOST, 'not-an-email'), 'Email').toEqual(
            GameRoomJoin.REJECTED
        );
        expect(await TestLoginLimits.register(gameConfig, 'h', GameRoomJoin.IPV4_HOST), 'Limit kept').toEqual(GameRoomJoin.ACCEPTED);
    }

    static async runGuestsLimitTest(page, gameConfig)
    {
        await SecurityApi.updateSettings(gameConfig, {guestsMaxPerIp: 1, windowMs: TestLoginLimits.SHORT_WINDOW_MS});
        expect(await TestLoginLimits.joinGuest(gameConfig, GameRoomJoin.IPV4_HOST), 'First').toEqual(GameRoomJoin.ACCEPTED);
        expect(await TestLoginLimits.joinGuest(gameConfig, GameRoomJoin.IPV4_HOST), 'Uniform text').toEqual(GameRoomJoin.REJECTED);
        expect(await TestLoginLimits.joinGuest(gameConfig, GameRoomJoin.IPV6_HOST), 'Other address').toEqual(GameRoomJoin.ACCEPTED);
        await page.waitForTimeout(TestLoginLimits.SHORT_WINDOW_MS);
        expect(await TestLoginLimits.joinGuest(gameConfig, GameRoomJoin.IPV4_HOST), 'Window ended').toEqual(GameRoomJoin.ACCEPTED);
        await SecurityApi.updateSettings(gameConfig, {guestsMaxPerIp: 0});
        for(let attempt of [1, 2]){
            expect(await TestLoginLimits.joinGuest(gameConfig, GameRoomJoin.IPV4_HOST), 'Disabled '+attempt).toEqual(
                GameRoomJoin.ACCEPTED
            );
        }
    }

    static async runGameJoinsLimitTest(page, gameConfig)
    {
        await SecurityApi.updateSettings(gameConfig, {gameLoginMaxJoins: 2, gameLoginWindowMs: TestLoginLimits.SHORT_WINDOW_MS});
        await TestLoginLimits.expectLogins(gameConfig, [gameConfig.e2eUsername2, gameConfig.e2eUsername3], GameRoomJoin.IPV4_HOST, GameRoomJoin.ACCEPTED);
        await TestLoginLimits.expectLogins(gameConfig, [gameConfig.e2eUsername], GameRoomJoin.IPV4_HOST, GameRoomJoin.REJECTED);
        await page.waitForTimeout(TestLoginLimits.SHORT_WINDOW_MS);
        await TestLoginLimits.expectLogins(gameConfig, [gameConfig.e2eUsername], GameRoomJoin.IPV4_HOST, GameRoomJoin.ACCEPTED);
        await SecurityApi.updateSettings(gameConfig, {gameLoginMaxJoins: 0});
        await TestLoginLimits.expectLogins(
            gameConfig,
            [gameConfig.e2eUsername, gameConfig.e2eUsername2, gameConfig.e2eUsername3],
            GameRoomJoin.IPV4_HOST,
            GameRoomJoin.ACCEPTED
        );
    }

    static async runUsernameJoinsTest(gameConfig)
    {
        await SecurityApi.updateSettings(gameConfig, {gameLoginMaxJoins: 2});
        await TestLoginLimits.expectLogins(gameConfig, [gameConfig.e2eUsername], GameRoomJoin.IPV4_HOST, GameRoomJoin.ACCEPTED);
        await TestLoginLimits.expectLogins(gameConfig, [gameConfig.e2eUsername], GameRoomJoin.IPV6_HOST, GameRoomJoin.ACCEPTED);
        await TestLoginLimits.expectLogins(gameConfig, [gameConfig.e2eUsername], GameRoomJoin.IPV6_HOST, GameRoomJoin.REJECTED);
        await TestLoginLimits.expectLogins(gameConfig, [gameConfig.e2eUsername2], GameRoomJoin.IPV4_HOST, GameRoomJoin.ACCEPTED);
    }

    static async loginAgain(page, gameConfig, longRun)
    {
        await page.click(Selectors.hud.logout);
        await Login.loginToSelection(page, gameConfig.e2eUsername, gameConfig.e2ePassword, longRun);
        expect(await Login.selectPlayer(page, gameConfig.e2ePlayerName)).toBe(true);
        await page.click(Selectors.characterSelect.selectorSubmit);
    }

    static async runRoomsJoinsLimitTest(page, screenshots, gameConfig, longRun)
    {
        await SecurityApi.updateSettings(gameConfig, {roomsLoginMaxJoins: 1});
        await Login.loginRootPlayer(page, gameConfig, longRun);
        expect(await page.evaluate(async (sceneName) => [
            Boolean(await window.reldens.gameClient.joinOrCreate(sceneName, window.reldens.userData)),
            window.reldens.gameClient.lastErrorMessage
        ], Login.TOWN_ROOM_NAME), 'Second scene join').toEqual([false, GameConst.INVALID_LOGIN_MESSAGE]);
        await TestLoginLimits.loginAgain(page, gameConfig, longRun);
        await expect(page.locator(Selectors.reloadModal.message), 'Second feature room join').toHaveText(
            GameTranslations.game.errors.joiningFeatureRoom.replace('%joinRoomName', ChatConst.CHAT_GLOBAL),
            {timeout: TimeConstants.forLongRun(TimeConstants.GAME_START, longRun)}
        );
        await screenshots.capture(page, 'rooms-joins-limit');
    }

    static async runRoomsJoinsDisabledTest(page, gameConfig, longRun)
    {
        await SecurityApi.updateSettings(gameConfig, {roomsLoginMaxJoins: 0});
        await Login.loginRootPlayer(page, gameConfig, longRun);
        await TestLoginLimits.loginAgain(page, gameConfig, longRun);
        await page.waitForSelector(Selectors.body.gameEngineStarted, {
            timeout: TimeConstants.forLongRun(TimeConstants.GAME_START, longRun)
        });
        await expect(page.locator(Selectors.reloadModal.container), 'No limit').toHaveCount(0);
    }

    static run()
    {
        test.describe('Login Limits', () => {
            test.beforeEach(async ({ gameConfig, e2eGroup }) => {
                await PlayerReset.resetAll(gameConfig, e2eGroup);
            });
            test('registration limit ends with its window, only limits its address and 0 disables it', async ({ page, gameConfig }) => {
                await TestLoginLimits.runRegistrationLimitTest(page, gameConfig);
            });
            test('invalid registrations do not consume the registration limit', async ({ gameConfig }) => {
                await TestLoginLimits.runInvalidRegistrationTest(gameConfig);
            });
            test('guests limit ends with its window, answers the invalid login text and 0 disables it', async ({ page, gameConfig }) => {
                await TestLoginLimits.runGuestsLimitTest(page, gameConfig);
            });
            test('game joins limit counts every username of the address, ends with its window and 0 disables it', async ({ page, gameConfig }) => {
                await TestLoginLimits.runGameJoinsLimitTest(page, gameConfig);
            });
            test('game joins limit counts every address of the username', async ({ gameConfig }) => {
                await TestLoginLimits.runUsernameJoinsTest(gameConfig);
            });
            test('rooms joins limit rejects the next scene and feature room joins', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestLoginLimits.runRoomsJoinsLimitTest(page, screenshots, gameConfig, longRun);
            });
            test('rooms joins limit at 0 does not limit the joins', async ({ page, gameConfig, longRun }) => {
                await TestLoginLimits.runRoomsJoinsDisabledTest(page, gameConfig, longRun);
            });
        });
    }

}

TestLoginLimits.run();
