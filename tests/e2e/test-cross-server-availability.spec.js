/**
 *
 * Reldens - Test Cross Server Availability
 *
 * Tests how server-1 decides a move into the second house of server-2 (exclusive group, the second house stored with
 * the server-2 address by CrossServerHouseAssignment, the player in the town on server-1): with the server-1 blocking
 * on and a reachable status of server-2 cached, server-2 going down (emulated by another signed tokens secret on
 * server-2, so it refuses every signed request of server-1 and the joins of the arriving players like a server that
 * does not answer, since a run can not stop server-2) does not stop the move: the reconnect error modal shows, the
 * state is already stored in the second house and the next login is refused until server-2 is back, then it enters the
 * second house; with the server-1 blocking off and server-2 overloaded, server-1 does not ask server-2, the move goes,
 * the translated busy reconnect modal shows and the state is stored in the second house; and an unreachable server-2
 * keeps the change point rejected with the unreachable chat error while its status is cached, also once it is back,
 * and the move is accepted after the cached status expired; and a guest of server-1 crossing into the second house (a
 * guest room) is accepted by server-2 with its generated password, with no modal and no failed login counted there
 * (a teleport and a death teleport join the next room through the same client reconnection with the same guest data).
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { CrossServerHouseAssignment } = require('./helpers/cross-server-house-assignment');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { LoginServerApi } = require('./helpers/login-server-api');
const { SecurityApi } = require('./helpers/security-api');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { CharacterCreation } = require('./helpers/character-creation');
const { MovementScenario } = require('./helpers/movement-scenario');
const { ChatSteps } = require('./helpers/chat-steps');
const { Navigation } = require('./helpers/navigation');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { GameConst } = require('../../lib/game/constants');
const { ChatConst } = require('../../lib/chat/constants');
const GameTranslations = require('../../lib/game/client/snippets/en_US');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestCrossServerAvailability
{

    static LONG_CACHE_MS = 600000;
    static REMOTE_STATUS_PATH = '/api/e2e/login-server/remote-status';

    static async crossToSecondHouse(context, playerName)
    {
        let {page, gameConfig, longRun} = context;
        await MovementScenario.placePlayerOnReturnPoint(
            page,
            MovementScenario.createWalkContext(gameConfig, Login.TOWN_ROOM_NAME, playerName, longRun)
        );
        await RoomObjectsApi.placePlayerOnChangePoint(
            page,
            gameConfig,
            Login.TOWN_ROOM_NAME,
            CrossServerHouseAssignment.SECOND_HOUSE
        );
    }

    static async expectUnreachableLines(page, linesCount, message)
    {
        await expect.poll(
            async () => (await ChatSteps.fetchTexts(page, ChatConst.TYPES.ERROR)).filter(
                errorText => GameConst.ROOM_UNAVAILABLE.SERVER_UNREACHABLE === errorText
            ).length,
            {message, timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(linesCount);
        expect(await Navigation.getCurrentRoomName(page), message).toBe(Login.TOWN_ROOM_NAME);
    }

    static async expectStateInSecondHouse(gameConfig)
    {
        expect(
            (await E2eSeedAndRestoreApi.fetchPlayerState(gameConfig, gameConfig.e2ePlayerName)).room_id,
            'The state is already stored in the second house'
        ).toBe((await CrossServerHouseAssignment.fetchHouseArrival(gameConfig)).roomId);
    }

    static async runDownAfterCachedStatusTest(context)
    {
        let {page, gameConfig, longRun} = context;
        let secondServerConfig = await CrossServerHouseAssignment.loginWithRemoteChecks(context);
        let cachedStatus = await SecurityApi.request(gameConfig, 'POST', TestCrossServerAvailability.REMOTE_STATUS_PATH, {
            cacheMs: TestCrossServerAvailability.LONG_CACHE_MS,
            serverUrl: secondServerConfig.serverBaseUrl
        });
        expect(cachedStatus.status.isReachable, 'Server-1 cached a reachable status of server-2').toBe(true);
        await LoginServerApi.setSignedTokensSecret(secondServerConfig, true);
        await TestCrossServerAvailability.crossToSecondHouse(context, gameConfig.e2ePlayerName);
        await expect(page.locator(Selectors.reloadModal.message), 'Server-2 is down: the reconnect error modal').toHaveText(
            GameTranslations.game.errors.reconnectClient,
            {timeout: TimeConstants.ROOM_TRANSITION}
        );
        await TestCrossServerAvailability.expectStateInSecondHouse(gameConfig);
        let nextLoginPage = (await Login.openClientPage(page, gameConfig)).clientPage;
        await Login.submitLogin(nextLoginPage, gameConfig.e2eUsername, gameConfig.e2ePassword, longRun);
        await expect(nextLoginPage.locator(Selectors.login.error), 'The next login is refused while server-2 is down')
            .toHaveText(GameConst.JOIN_GAME_ERROR_MESSAGE, {timeout: TimeConstants.SERVER_RESPONSE});
        await LoginServerApi.setSignedTokensSecret(secondServerConfig, false);
        await Login.loginRootPlayer(nextLoginPage, gameConfig, longRun);
        await Navigation.waitForRoom(nextLoginPage, CrossServerHouseAssignment.SECOND_HOUSE, TimeConstants.ROOM_TRANSITION);
    }

    static async runUncheckedBusyServerTest(context)
    {
        let {page, gameConfig, longRun} = context;
        let secondServerConfig = await CrossServerHouseAssignment.assignHouseToSecondServer(context);
        await Login.loginRootPlayer(page, gameConfig, longRun);
        await LoginServerApi.setServerOverloaded(secondServerConfig, true);
        await TestCrossServerAvailability.crossToSecondHouse(context, gameConfig.e2ePlayerName);
        await expect(page.locator(Selectors.reloadModal.message), 'Server-2 rejects the arrival as busy').toHaveText(
            GameTranslations.game.errors.roomServerBusy,
            {timeout: TimeConstants.ROOM_TRANSITION}
        );
        await TestCrossServerAvailability.expectStateInSecondHouse(gameConfig);
    }

    static async runCachedUnreachableTest(context)
    {
        let {page, gameConfig} = context;
        await CrossServerHouseAssignment.loginWithRemoteChecks(context);
        await SecurityApi.request(gameConfig, 'POST', TestCrossServerAvailability.REMOTE_STATUS_PATH, {
            cacheMs: TestCrossServerAvailability.LONG_CACHE_MS
        });
        await LoginServerApi.setSignedTokensSecret(gameConfig, true);
        await TestCrossServerAvailability.crossToSecondHouse(context, gameConfig.e2ePlayerName);
        await TestCrossServerAvailability.expectUnreachableLines(page, 1, 'An unreachable server-2 rejects the move');
        await LoginServerApi.setSignedTokensSecret(gameConfig, false);
        await TestCrossServerAvailability.crossToSecondHouse(context, gameConfig.e2ePlayerName);
        await TestCrossServerAvailability.expectUnreachableLines(
            page,
            2,
            'Server-2 back while its unreachable status is cached: the move is still rejected'
        );
        await SecurityApi.request(gameConfig, 'POST', TestCrossServerAvailability.REMOTE_STATUS_PATH, {expire: true});
        await TestCrossServerAvailability.crossToSecondHouse(context, gameConfig.e2ePlayerName);
        await Navigation.waitForRoom(page, CrossServerHouseAssignment.SECOND_HOUSE, TimeConstants.ROOM_TRANSITION);
    }

    static async runGuestArrivalTest(context)
    {
        let {page, longRun} = context;
        let secondServerConfig = await CrossServerHouseAssignment.assignHouseToSecondServer(context);
        let guest = await CharacterCreation.enterGuestInGame(page, longRun, Login.TOWN_ROOM_NAME);
        await TestCrossServerAvailability.crossToSecondHouse(context, guest.playerName);
        await Navigation.waitForRoom(page, CrossServerHouseAssignment.SECOND_HOUSE, TimeConstants.ROOM_TRANSITION);
        expect(
            {
                hasModal: await page.locator(Selectors.reloadModal.container).isVisible(),
                failedLogins: (await SecurityApi.fetchIdentityState(secondServerConfig, guest.username)).hits
            },
            'Server-2 accepts the guest with its generated password: no modal and no failed login counted'
        ).toEqual({hasModal: false, failedLogins: 0});
    }

    static run()
    {
        test.describe('Cross Server Availability', () => {
            test('server-2 down after a reachable status was cached lets the move go and blocks the next login until it is back', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerAvailability.runDownAfterCachedStatusTest({page, gameConfig, e2eGroup, longRun});
            });
            test('with the server-1 blocking off a busy server-2 is not checked and rejects the arrival as busy', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerAvailability.runUncheckedBusyServerTest({page, gameConfig, e2eGroup, longRun});
            });
            test('an unreachable server-2 stays rejected while its status is cached and is entered once it expired', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerAvailability.runCachedUnreachableTest({page, gameConfig, e2eGroup, longRun});
            });
            test('a guest crossing into a guest room of server-2 is accepted there with its generated password', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerAvailability.runGuestArrivalTest({page, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestCrossServerAvailability.run();
