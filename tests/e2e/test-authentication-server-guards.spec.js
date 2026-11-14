/**
 *
 * Reldens - Test Authentication Server Guards
 *
 * Tests the login guards that depend on the server state: the signed disconnect route with bad, expired and valid
 * tokens, the other servers of a multi-server setup unavailable, answering an error or switched off, the overloaded
 * server on the login and on the scene join, the single player mode with the player room unavailable, the rooms origin
 * validation and the terms and conditions route with an unknown language.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { LoginServerApi } = require('./helpers/login-server-api');
const { LoginServerState } = require('./helpers/login-server-state');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { SecurityApi } = require('./helpers/security-api');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { GameConst } = require('../../lib/game/constants');
const { GameRoomJoin } = require('./helpers/game-room-join');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAuthenticationServerGuards
{

    static NOTHING_CHANGED_WAIT_MS = 1000;
    static UNAVAILABLE_SERVER_URL = 'http://127.0.0.1:9';
    static OTHER_ORIGIN = 'https://e2e-other-origin.test';
    static SESSION_ENDED_MESSAGE = 'Your session ended, please login again.';
    static TOKEN_LIFETIME_MS = 60000;
    static TERMS_PATH = GameConst.ROUTE_PATHS.TERMS_AND_CONDITIONS;

    static async postDisconnect(page, requestBody)
    {
        return (await (await page.request.post(GameConst.ROUTE_PATHS.DISCONNECT_USER, {data: requestBody})).json()).isSuccess;
    }

    static fetchErrorServerUrl(gameConfig)
    {
        return SecurityApi.baseUrl(gameConfig)+LoginServerState.OTHER_SERVER_ERROR_PATH;
    }

    static async expectSessionKept(page, label)
    {
        await page.waitForTimeout(TestAuthenticationServerGuards.NOTHING_CHANGED_WAIT_MS);
        await expect(page.locator(Selectors.reloadModal.container), label).toBeHidden();
        await expect(page.locator(Selectors.body.gameEngineStarted), label).toHaveCount(1);
    }

    static async fetchRejectedLoginText(gameConfig, requestPage, longRun)
    {
        return await Login.submitLoginExpectingError(requestPage, gameConfig.e2eUsername, gameConfig.e2ePassword, longRun);
    }

    static async runRejectedTokensTest(page, screenshots, gameConfig, longRun)
    {
        await Login.loginRootPlayer(page, gameConfig, longRun);
        let username = gameConfig.e2eUsername;
        let expiredToken = await LoginServerApi.fetchDisconnectToken(
            gameConfig,
            username,
            Date.now() - TestAuthenticationServerGuards.TOKEN_LIFETIME_MS
        );
        for(let token of ['not-a-signed-token', expiredToken]){
            expect(await TestAuthenticationServerGuards.postDisconnect(page, {username, token}), token).toBe(false);
        }
        await TestAuthenticationServerGuards.expectSessionKept(page, 'A rejected token disconnects nobody');
        await screenshots.capture(page, 'disconnect-rejected-tokens');
    }

    static async runDisconnectRequestsTest(page, screenshots, gameConfig, longRun)
    {
        await Login.loginRootPlayer(page, gameConfig, longRun);
        let validExpiration = Date.now() + TestAuthenticationServerGuards.TOKEN_LIFETIME_MS;
        expect(await TestAuthenticationServerGuards.postDisconnect(page, {}), 'Missing username').toBe(false);
        let notLoggedToken = await LoginServerApi.fetchDisconnectToken(gameConfig, gameConfig.e2eUsername2, validExpiration);
        expect(await TestAuthenticationServerGuards.postDisconnect(page, {
            username: gameConfig.e2eUsername2,
            token: notLoggedToken
        }), 'A user without a session has nothing to disconnect').toBe(true);
        expect(await TestAuthenticationServerGuards.postDisconnect(page, {
            username: gameConfig.e2eUsername,
            token: notLoggedToken
        }), 'A token signed for another username').toBe(false);
        await TestAuthenticationServerGuards.expectSessionKept(page, 'Only the requested user is disconnected');
        let loggedToken = await LoginServerApi.fetchDisconnectToken(gameConfig, gameConfig.e2eUsername, validExpiration);
        expect(await TestAuthenticationServerGuards.postDisconnect(page, {
            username: gameConfig.e2eUsername,
            token: loggedToken
        }), 'A valid token disconnects the user').toBe(true);
        await expect(page.locator(Selectors.reloadModal.message)).toHaveText(
            TestAuthenticationServerGuards.SESSION_ENDED_MESSAGE,
            {timeout: TimeConstants.forLongRun(TimeConstants.GAME_START, longRun)}
        );
        await screenshots.capture(page, 'disconnect-valid-token');
    }

    static async runOtherServerUnavailableTest(page, screenshots, gameConfig, longRun)
    {
        await LoginServerApi.setOtherServer(gameConfig, TestAuthenticationServerGuards.UNAVAILABLE_SERVER_URL, true);
        await Login.loginToSelection(page, gameConfig.e2eUsername, gameConfig.e2ePassword, longRun);
        await screenshots.capture(page, 'other-server-unavailable-login-continues');
    }

    static async runOtherServerErrorTest(page, screenshots, gameConfig, longRun)
    {
        await LoginServerApi.setOtherServer(
            gameConfig,
            TestAuthenticationServerGuards.fetchErrorServerUrl(gameConfig),
            true
        );
        expect(await TestAuthenticationServerGuards.fetchRejectedLoginText(gameConfig, page, longRun)).toBe(
            GameConst.JOIN_GAME_ERROR_MESSAGE
        );
        expect(await LoginServerApi.fetchOtherServerHits(gameConfig), 'The other server was asked once').toBe(1);
        await screenshots.capture(page, 'other-server-error-login-rejected');
    }

    static async runOtherServerSwitchedOffTest(page, screenshots, gameConfig, longRun)
    {
        await LoginServerApi.setOtherServer(
            gameConfig,
            TestAuthenticationServerGuards.fetchErrorServerUrl(gameConfig),
            false
        );
        await Login.loginToSelection(page, gameConfig.e2eUsername, gameConfig.e2ePassword, longRun);
        expect(await LoginServerApi.fetchOtherServerHits(gameConfig), 'No request must be sent').toBe(0);
        await screenshots.capture(page, 'other-server-disconnection-off');
    }

    static async runServerBusyLoginTest(page, screenshots, gameConfig, longRun)
    {
        await LoginServerApi.setServerOverloaded(gameConfig, true);
        expect(await TestAuthenticationServerGuards.fetchRejectedLoginText(gameConfig, page, longRun)).toBe(
            GameConst.SERVER_BUSY_MESSAGE
        );
        await screenshots.capture(page, 'server-busy-login');
        await LoginServerApi.setServerOverloaded(gameConfig, false);
        await Login.loginToSelection(page, gameConfig.e2eUsername, gameConfig.e2ePassword, longRun);
    }

    static async runArrivalRejectedTest(page, secondPage, screenshots, gameConfig, longRun)
    {
        await Login.loginRootPlayer(secondPage, gameConfig, longRun, '2');
        await Login.loginToSelection(page, gameConfig.e2eUsername, gameConfig.e2ePassword, longRun);
        await LoginServerApi.setServerOverloaded(gameConfig, true);
        await page.click(Selectors.characterSelect.selectorSubmit);
        await expect(page.locator(GameConst.SELECTORS.PLAYER_SELECTION_ERRORS)).not.toBeEmpty({
            timeout: TimeConstants.forLongRun(TimeConstants.GAME_START, longRun)
        });
        await expect(page.locator(Selectors.body.gameEngineStarted), 'The join must be rejected').toHaveCount(0);
        await screenshots.capture(page, 'scene-join-arrival-rejected');
    }

    static async runSinglePlayerRoomUnavailableTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun)
    {
        await Login.loginRootPlayer(secondPage, gameConfig, longRun, '2');
        await E2eSeedAndRestoreApi.overrideConfig(gameConfig, e2eGroup, 'client/players/multiplePlayers/enabled', false);
        await E2eSeedAndRestoreApi.overrideConfig(gameConfig, e2eGroup, 'client/rooms/selection/allowOnLogin', false);
        await SecurityApi.request(gameConfig, 'POST', '/api/e2e/login-server/rooms-unavailable', {});
        expect(await TestAuthenticationServerGuards.fetchRejectedLoginText(gameConfig, page, longRun)).toBe(
            GameConst.PLAYER_ROOM_UNAVAILABLE_MESSAGE
        );
        await screenshots.capture(page, 'single-player-room-unavailable');
    }

    static async runAllowedOriginTest(page, secondPage, screenshots, gameConfig, longRun)
    {
        await Login.loginRootPlayer(secondPage, gameConfig, longRun, '2');
        await LoginServerApi.setRoomsOrigin(gameConfig, {
            validate: true,
            allowWithoutOrigin: true,
            allowedOrigins: [SecurityApi.baseUrl(gameConfig)]
        });
        await Login.loginToSelection(page, gameConfig.e2eUsername, gameConfig.e2ePassword, longRun);
        await screenshots.capture(page, 'allowed-origin-login');
    }

    static async runRejectedOriginTest(page, secondPage, screenshots, gameConfig, longRun)
    {
        await Login.loginRootPlayer(secondPage, gameConfig, longRun, '2');
        await LoginServerApi.setRoomsOrigin(gameConfig, {
            validate: true,
            allowWithoutOrigin: true,
            allowedOrigins: [TestAuthenticationServerGuards.OTHER_ORIGIN]
        });
        expect(await TestAuthenticationServerGuards.fetchRejectedLoginText(gameConfig, page, longRun)).toBe(
            GameConst.JOIN_GAME_ERROR_MESSAGE
        );
        await screenshots.capture(page, 'rejected-origin-login');
    }

    static async fetchNoOriginJoinError(gameConfig)
    {
        return (await GameRoomJoin.login(gameConfig, 'e2e-no-origin-user', 'e2e-no-origin-password')).error;
    }

    static async runMissingOriginTest(page, secondPage, gameConfig, longRun)
    {
        await Login.loginRootPlayer(secondPage, gameConfig, longRun, '2');
        let allowedOrigins = [TestAuthenticationServerGuards.OTHER_ORIGIN];
        await LoginServerApi.setRoomsOrigin(gameConfig, {validate: true, allowWithoutOrigin: true, allowedOrigins});
        expect(await TestAuthenticationServerGuards.fetchNoOriginJoinError(gameConfig), 'Allowed').toBe(
            GameConst.INVALID_LOGIN_MESSAGE
        );
        await LoginServerApi.setRoomsOrigin(gameConfig, {validate: true, allowWithoutOrigin: false, allowedOrigins});
        expect(await TestAuthenticationServerGuards.fetchNoOriginJoinError(gameConfig), 'Refused').toBe(
            GameConst.JOIN_GAME_ERROR_MESSAGE
        );
    }

    static async runTermsUnknownLanguageTest(page)
    {
        let defaultTerms = await (await page.request.get(TestAuthenticationServerGuards.TERMS_PATH)).json();
        let unknownLanguageTerms = await (
            await page.request.get(TestAuthenticationServerGuards.TERMS_PATH+'?lang=zz')
        ).json();
        expect(defaultTerms.link, 'The default texts must be configured').toBeTruthy();
        expect(unknownLanguageTerms).toEqual(defaultTerms);
    }

    static run()
    {
        test.describe('Authentication Server Guards', () => {
            test('disconnect route with an invalid or expired token disconnects nobody', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAuthenticationServerGuards.runRejectedTokensTest(page, screenshots, gameConfig, longRun);
            });
            test('disconnect route handles a missing username and valid tokens', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAuthenticationServerGuards.runDisconnectRequestsTest(page, screenshots, gameConfig, longRun);
            });
            test('other server unavailable lets the login continue', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAuthenticationServerGuards.runOtherServerUnavailableTest(page, screenshots, gameConfig, longRun);
            });
            test('other server answering an error rejects the login', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAuthenticationServerGuards.runOtherServerErrorTest(page, screenshots, gameConfig, longRun);
            });
            test('disconnect on server change off sends no request', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAuthenticationServerGuards.runOtherServerSwitchedOffTest(page, screenshots, gameConfig, longRun);
            });
            test('login is rejected while the server is overloaded', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAuthenticationServerGuards.runServerBusyLoginTest(page, screenshots, gameConfig, longRun);
            });
            test('scene join arriving from another server is rejected while overloaded', async ({ page, secondPage, screenshots, gameConfig, longRun }) => {
                await TestAuthenticationServerGuards.runArrivalRejectedTest(page, secondPage, screenshots, gameConfig, longRun);
            });
            test('single player login is rejected when the player room is unavailable', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAuthenticationServerGuards.runSinglePlayerRoomUnavailableTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('allowed origin can log in', async ({ page, secondPage, screenshots, gameConfig, longRun }) => {
                await TestAuthenticationServerGuards.runAllowedOriginTest(page, secondPage, screenshots, gameConfig, longRun);
            });
            test('rejected origin cannot log in', async ({ page, secondPage, screenshots, gameConfig, longRun }) => {
                await TestAuthenticationServerGuards.runRejectedOriginTest(page, secondPage, screenshots, gameConfig, longRun);
            });
            test('missing origin follows the allow without origin setting', async ({ page, secondPage, gameConfig, longRun }) => {
                await TestAuthenticationServerGuards.runMissingOriginTest(page, secondPage, gameConfig, longRun);
            });
            test('terms with an unknown language answer the default texts', async ({ page }) => {
                await TestAuthenticationServerGuards.runTermsUnknownLanguageTest(page);
            });
        });
    }

}

TestAuthenticationServerGuards.run();
