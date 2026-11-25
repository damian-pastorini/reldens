/**
 *
 * Reldens - Test Cross Server Signed Requests
 *
 * Tests the signed requests between the two servers (exclusive group, the second house stored with the server-2
 * address and the town with the server-1 address by CrossServerHouseAssignment): a disconnection token accepted by
 * server-1 is rejected when it is replayed on server-2 (the token names the server it is sent to) and the server-2
 * session is kept until a server-2 token ends it; a server-1 with another signed tokens secret gets its login and its
 * scene joins refused (server-2 answers its disconnection requests with no success) and shows the second house
 * unreachable (server-2 answers its status request with an error, seen with the server blocking on); another server
 * that never answers the disconnect route makes the login and the scene joins fail after the disconnection request
 * timeout and not when that server answers; the server-1 logins and moves keep working while the server-2
 * disconnect route limiter is exhausted from the loopback addresses the servers call each other from; and with the
 * server-2 teams and chat sync limiters exhausted the same way (invalid requests, 429 over the limit), the team of a
 * member crossing to server-2 and a private message from server-1 still reach server-2 (a valid signed request skips
 * the limiter).
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { CrossServerHouseAssignment } = require('./helpers/cross-server-house-assignment');
const { E2eServerInstances } = require('./helpers/e2e-server-instances');
const { LoginServerApi } = require('./helpers/login-server-api');
const { LoginServerState } = require('./helpers/login-server-state');
const { SecurityApi } = require('./helpers/security-api');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { GameRoomJoin } = require('./helpers/game-room-join');
const { ChatSteps } = require('./helpers/chat-steps');
const { TeamSteps } = require('./helpers/team-steps');
const { TeamsConst } = require('../../lib/teams/constants');
const { Navigation } = require('./helpers/navigation');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { GameConst } = require('../../lib/game/constants');
const { ChatConst } = require('../../lib/chat/constants');
const GameTranslations = require('../../lib/game/client/snippets/en_US');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestCrossServerSignedRequests
{

    static TOKEN_LIFETIME_MS = 60000;
    static REFUSAL_TIMEOUT_MS = GameConst.DISCONNECTION.REQUEST_TIMEOUT_MS + TimeConstants.SERVER_RESPONSE;
    static LOOPBACK_HOSTS = [GameRoomJoin.IPV4_HOST, GameRoomJoin.IPV6_HOST];

    static async fetchDisconnectAnswers(username, serversTokens)
    {
        let answers = [];
        for(let [serverConfig, token] of serversTokens){
            let answer = await SecurityApi.request(serverConfig, 'POST', GameConst.ROUTE_PATHS.DISCONNECT_USER, {username, token});
            answers.push(answer.isSuccess);
        }
        return answers;
    }

    static async runReplayedTokenTest(context)
    {
        let {page, gameConfig, longRun} = context;
        let secondServerConfig = E2eServerInstances.forServer(gameConfig, CrossServerHouseAssignment.SECOND_SERVER);
        let secondServerPage = (await Login.openClientPage(page, secondServerConfig)).clientPage;
        await Login.loginRootPlayer(secondServerPage, secondServerConfig, longRun);
        let username = gameConfig.e2eUsername;
        let expiresAt = Date.now() + TestCrossServerSignedRequests.TOKEN_LIFETIME_MS;
        let firstServerToken = await LoginServerApi.fetchDisconnectToken(gameConfig, username, expiresAt);
        expect(
            await TestCrossServerSignedRequests.fetchDisconnectAnswers(
                username,
                [[gameConfig, firstServerToken], [secondServerConfig, firstServerToken]]
            ),
            'The server-1 token is accepted by server-1 and rejected when it is replayed on server-2'
        ).toEqual([true, false]);
        await secondServerPage.waitForTimeout(CrossServerHouseAssignment.QUIET_MS);
        await expect(secondServerPage.locator(Selectors.reloadModal.container), 'The server-2 session is kept').toBeHidden();
        let secondServerToken = await LoginServerApi.fetchDisconnectToken(secondServerConfig, username, expiresAt);
        expect(
            await TestCrossServerSignedRequests.fetchDisconnectAnswers(username, [[secondServerConfig, secondServerToken]]),
            'A server-2 token is accepted by server-2'
        ).toEqual([true]);
        await expect(secondServerPage.locator(Selectors.reloadModal.message), 'The server-2 token ends the server-2 session')
            .toHaveText(GameTranslations.game.errors.sessionEnded, {timeout: TimeConstants.SERVER_RESPONSE});
    }

    static async expectLoginRefused(context, message)
    {
        let {page, gameConfig, longRun} = context;
        await Login.submitLogin(page, gameConfig.e2eUsername, gameConfig.e2ePassword, longRun);
        await expect(page.locator(Selectors.login.error), message).toHaveText(
            GameConst.JOIN_GAME_ERROR_MESSAGE,
            {timeout: TestCrossServerSignedRequests.REFUSAL_TIMEOUT_MS}
        );
    }

    static async runOtherSecretLoginTest(context)
    {
        await CrossServerHouseAssignment.assignHouseToSecondServer(context);
        await LoginServerApi.setSignedTokensSecret(context.gameConfig, true);
        await TestCrossServerSignedRequests.expectLoginRefused(
            context,
            'Server-2 answers the disconnection request signed with another secret with no success: the login is refused'
        );
    }

    static async runOtherSecretJoinTest(context)
    {
        await CrossServerHouseAssignment.assignHouseToSecondServer(context);
        await Login.loginRootPlayer(context.page, context.gameConfig, context.longRun);
        await LoginServerApi.setSignedTokensSecret(context.gameConfig, true);
        await CrossServerHouseAssignment.expectRefusedMove(
            context,
            Login.FOREST_ROOM_NAME,
            'Server-2 answers the disconnection request of the forest join with no success: the join is refused',
            TestCrossServerSignedRequests.REFUSAL_TIMEOUT_MS
        );
    }

    static async runOtherSecretStatusTest(context)
    {
        let {page, gameConfig} = context;
        await CrossServerHouseAssignment.loginWithRemoteChecks(context);
        await LoginServerApi.setSignedTokensSecret(gameConfig, true);
        await RoomObjectsApi.placePlayerOnChangePoint(page, gameConfig, Login.TOWN_ROOM_NAME, CrossServerHouseAssignment.SECOND_HOUSE);
        await expect.poll(
            async () => await ChatSteps.fetchTexts(page, ChatConst.TYPES.ERROR),
            {message: 'Server-2 answers the status request with an error: unreachable', timeout: TimeConstants.SERVER_RESPONSE}
        ).toContain(GameConst.ROOM_UNAVAILABLE.SERVER_UNREACHABLE);
        expect(await Navigation.getCurrentRoomName(page), 'The player stays in the town').toBe(Login.TOWN_ROOM_NAME);
    }

    static async setSilentOtherServer(gameConfig)
    {
        await LoginServerApi.setOtherServer(
            gameConfig,
            SecurityApi.baseUrl(gameConfig)+LoginServerState.OTHER_SERVER_SILENT_PATH,
            true
        );
    }

    static async runSilentServerLoginTest(context)
    {
        await TestCrossServerSignedRequests.setSilentOtherServer(context.gameConfig);
        await TestCrossServerSignedRequests.expectLoginRefused(
            context,
            'The disconnection request to a server that never answers is aborted: the login is refused before its answer'
        );
        expect(await LoginServerApi.fetchOtherServerHits(context.gameConfig), 'The other server was asked once').toBe(1);
    }

    static async runSilentServerJoinTest(context)
    {
        await Login.loginRootPlayer(context.page, context.gameConfig, context.longRun);
        await TestCrossServerSignedRequests.setSilentOtherServer(context.gameConfig);
        await CrossServerHouseAssignment.expectRefusedMove(
            context,
            Login.FOREST_ROOM_NAME,
            'The disconnection request of the forest join is aborted: the join is refused before the server answers',
            TestCrossServerSignedRequests.REFUSAL_TIMEOUT_MS
        );
    }

    static async exhaustOnLoopbacks(serverConfig, route)
    {
        for(let loopbackHost of TestCrossServerSignedRequests.LOOPBACK_HOSTS){
            await SecurityApi.exhaustRoute(serverConfig, loopbackHost, route);
        }
    }

    static async runExhaustedLimitTest(context)
    {
        let secondServerConfig = await CrossServerHouseAssignment.assignHouseToSecondServer(context);
        await TestCrossServerSignedRequests.exhaustOnLoopbacks(secondServerConfig, GameConst.ROUTE_PATHS.DISCONNECT_USER);
        await Login.loginRootPlayer(context.page, context.gameConfig, context.longRun);
        await CrossServerHouseAssignment.walkFromTown(context, Login.FOREST_ROOM_NAME);
        expect(await Navigation.getCurrentRoomName(context.page), 'The player moves into the forest').toBe(
            Login.FOREST_ROOM_NAME
        );
    }

    static async runExhaustedSyncLimitTest(context)
    {
        let secondServerConfig = await CrossServerHouseAssignment.assignHouseToSecondServer(context);
        await TestCrossServerSignedRequests.exhaustOnLoopbacks(secondServerConfig, TeamsConst.SYNC.TEAMS_ROUTE);
        await TestCrossServerSignedRequests.exhaustOnLoopbacks(secondServerConfig, ChatConst.SYNC.ROUTE);
        let [mover, owner] = await TeamSteps.enterPlayers(context, 2);
        await TeamSteps.formTeam(context.gameConfig, owner, [mover]);
        await CrossServerHouseAssignment.walkFromTown(context, CrossServerHouseAssignment.SECOND_HOUSE);
        await expect.poll(
            async () => (await TeamSteps.fetchState(secondServerConfig)).teams?.[owner.playerId]?.playersIds || [],
            {
                message: 'The team update of server-1 reaches server-2 while its teams sync limiter is exhausted',
                timeout: TimeConstants.SERVER_RESPONSE
            }
        ).toEqual(TeamSteps.sortedIds([owner, mover]));
        await ChatSteps.recordChat(mover.page);
        let text = 'e2e-exhausted-sync-private-'+Date.now();
        await ChatSteps.sendText(owner.page, '@'+mover.playerName+' '+text);
        await expect.poll(
            async () => await ChatSteps.fetchTexts(mover.page, ChatConst.TYPES.PRIVATE),
            {
                message: 'The private message of server-1 reaches server-2 while its chat sync limiter is exhausted',
                timeout: TimeConstants.SERVER_RESPONSE
            }
        ).toContain(text);
    }

    static run()
    {
        test.describe('Cross Server Signed Requests', () => {
            test('a disconnection token accepted by server-1 is rejected when it is replayed on server-2', async ({ page, gameConfig, longRun }) => {
                await TestCrossServerSignedRequests.runReplayedTokenTest({page, gameConfig, longRun});
            });
            test('with another signed tokens secret on server-1 its login is refused', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerSignedRequests.runOtherSecretLoginTest({page, gameConfig, e2eGroup, longRun});
            });
            test('with another signed tokens secret on server-1 its scene joins are refused', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerSignedRequests.runOtherSecretJoinTest({page, gameConfig, e2eGroup, longRun});
            });
            test('with another signed tokens secret on server-1 the second house is unreachable', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerSignedRequests.runOtherSecretStatusTest({page, gameConfig, e2eGroup, longRun});
            });
            test('a login is refused after the timeout when the other server never answers', async ({ page, gameConfig, longRun }) => {
                await TestCrossServerSignedRequests.runSilentServerLoginTest({page, gameConfig, longRun});
            });
            test('a scene join is refused after the timeout when the other server never answers', async ({ page, gameConfig, longRun }) => {
                await TestCrossServerSignedRequests.runSilentServerJoinTest({page, gameConfig, longRun});
            });
            test('logins and moves keep working while the server-2 disconnect route limiter is exhausted', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerSignedRequests.runExhaustedLimitTest({page, gameConfig, e2eGroup, longRun});
            });
            test('team updates and private messages reach server-2 while its teams and chat sync limiters are exhausted', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerSignedRequests.runExhaustedSyncLimitTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestCrossServerSignedRequests.run();
