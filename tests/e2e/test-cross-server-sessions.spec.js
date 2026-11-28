/**
 *
 * Reldens - Test Cross Server Sessions
 *
 * Tests the sessions of one user on two servers (exclusive group, the second house on server-2 and the town on server-1
 * set by CrossServerHouseAssignment): the user playing in the town on server-1 logs in again from a page of server-2
 * (the town observer, logged in on the same return point, walks a clear line away first and the first session position
 * is read once its body settled, so no player contact moves it);
 * the first client shows the session ended modal, the town observer removes its sprite, and the second session starts
 * in the town on the position the first session had when it was ended; and the first move of a session to server-2
 * records no new login (no users_login row and no login_count increase), while a server-2 game room join that forges
 * the scene change flag for a player settled on server-1 ends that session with the session ended modal (not the server
 * change close that freezes the client) and records a new login; and a logout while playing on server-2 (the
 * player placed and its HP lowered there) stores the played time, and the next login from the server-1 page and then
 * from a server-2 page starts in the server-2 room on the saved position with the saved HP; and the daily login reward
 * claimed on server-1 and claimed again after the move to server-2 gives its items once; a session left on the
 * server-1 selection screen is ended (session ended modal) by the login of the same user from a server-2 page, which
 * keeps playing in the second house; with client/rooms/autoConnectServerGameRoom off in the initial client config of
 * the page (InitialClientConfig) the player visiting
 * the second house joins no server-2 game room, and a new login of the same user on server-1 still ends that server-2
 * session; with server/players/disconnectUsersOnServerChange off on both servers, the user playing on server-2 that
 * logs in again on server-1 and moves to server-2 ends its old server-2 session there (session ended modal, one player
 * of the user left in the second house, ISSUE #480); and the reward (the inventory and the reward
 * states of the player preserved and restored by the group reset).
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { CrossServerHouseAssignment } = require('./helpers/cross-server-house-assignment');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { RoomMovementApi } = require('./helpers/room-movement-api');
const { MovementScenario } = require('./helpers/movement-scenario');
const { SceneSpritesRecorder } = require('./helpers/scene-sprites-recorder');
const { Navigation } = require('./helpers/navigation');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { LoginServerApi } = require('./helpers/login-server-api');
const { Selectors } = require('./selectors');
const { RewardsSteps } = require('./helpers/rewards-steps');
const { InitialClientConfig } = require('./helpers/initial-client-config');
const { GameRoomJoin } = require('./helpers/game-room-join');
const GameTranslations = require('../../lib/game/client/snippets/en_US');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestCrossServerSessions
{

    static PLACED_OFFSET = 64;
    static LOWERED_HP = 7;
    static PLAYED_MS = 2000;
    static AUTO_CONNECT_PATH = 'client/rooms/autoConnectServerGameRoom';
    static OBSERVER_WALK_TILES = [4, 3, 2];

    static async runSecondLoginFromOtherServerTest(context)
    {
        let {page, secondPage, gameConfig, longRun} = context;
        let playerName = gameConfig.e2ePlayerName;
        let secondServerConfig = await CrossServerHouseAssignment.assignHouseToSecondServer(context);
        let townSessionId = await CrossServerHouseAssignment.loginWithTownObserver(context);
        await MovementScenario.walkClearLine(
            secondPage,
            MovementScenario.createWalkContext(gameConfig, Login.TOWN_ROOM_NAME, gameConfig.e2ePlayerName2, longRun),
            Login.TOWN_ROOM_NAME,
            gameConfig.e2ePlayerName2,
            TestCrossServerSessions.OBSERVER_WALK_TILES
        );
        let firstSession = await RoomMovementApi.waitForPlayerSettled(
            gameConfig,
            Login.TOWN_ROOM_NAME,
            playerName,
            TimeConstants.SERVER_RESPONSE
        );
        let secondClient = (await Login.openClientPage(page, secondServerConfig)).clientPage;
        await Login.loginRootPlayer(secondClient, secondServerConfig, longRun);
        await Navigation.waitForRoom(secondClient, Login.TOWN_ROOM_NAME, TimeConstants.ROOM_TRANSITION);
        await TestCrossServerSessions.expectSessionEnded(page, 'The first client shows the session ended modal');
        await SceneSpritesRecorder.waitForRemovedPlayer(secondPage, townSessionId, TimeConstants.SERVER_RESPONSE);
        let secondSession = await GameplayE2eStateApi.fetchPlayer(gameConfig, Login.TOWN_ROOM_NAME, playerName);
        let secondState = {
            position: [secondSession.x, secondSession.y],
            isGameOver: await secondClient.evaluate(() => Boolean(window.reldens.gameOver))
        };
        let firstPosition = [firstSession.x, firstSession.y];
        expect(
            secondState,
            'The second session from the server-2 page plays on the ended first session position '
                +sc.toJsonString({firstPosition, secondState, error: secondSession.error})
        ).toEqual({position: firstPosition, isGameOver: false});
    }

    static async fetchLoginsRecord(gameConfig)
    {
        let storedUser = (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'users', {username: gameConfig.e2eUsername}))[0];
        let loginsRecord = {count: Number(storedUser.login_count)};
        loginsRecord.rows = (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'usersLogin', {user_id: storedUser.id})).length;
        return loginsRecord;
    }

    static async runForgedSceneChangeLoginTest(context)
    {
        let {page, gameConfig, longRun} = context;
        let secondServerConfig = await CrossServerHouseAssignment.assignHouseToSecondServer(context);
        await Login.loginRootPlayer(page, gameConfig, longRun);
        let loggedIn = await TestCrossServerSessions.fetchLoginsRecord(gameConfig);
        let joinResult = await GameRoomJoin.join(
            secondServerConfig,
            {username: gameConfig.e2eUsername, password: gameConfig.e2ePassword, isSceneChange: true}
        );
        await expect(
            page.locator(Selectors.reloadModal.message),
            'The client playing on server-1 shows the session ended instead of freezing'
        ).toHaveText(GameTranslations.game.errors.sessionEnded, {timeout: TimeConstants.SERVER_RESPONSE});
        expect(
            {joinResult, logins: await TestCrossServerSessions.fetchLoginsRecord(gameConfig)},
            'The forged scene change game room join on server-2 is accepted as a new login'
        ).toEqual({joinResult: GameRoomJoin.ACCEPTED, logins: {count: loggedIn.count + 1, rows: loggedIn.rows + 1}});
    }

    static async runNoNewLoginOnMoveTest(context)
    {
        let {page, gameConfig} = context;
        await CrossServerHouseAssignment.assignHouseToSecondServer(context);
        await Login.loginRootPlayer(page, gameConfig, context.longRun);
        let loggedIn = await TestCrossServerSessions.fetchLoginsRecord(gameConfig);
        await CrossServerHouseAssignment.walkFromTown(context, CrossServerHouseAssignment.SECOND_HOUSE);
        await page.waitForTimeout(CrossServerHouseAssignment.QUIET_MS);
        expect(
            await TestCrossServerSessions.fetchLoginsRecord(gameConfig),
            'The first move to server-2 records no new login row and no new login count'
        ).toEqual(loggedIn);
    }

    static async logoutFromSecondServer(page, gameConfig, secondServerConfig)
    {
        await page.click(Selectors.hud.logout);
        await expect.poll(
            async () => LoginServerApi.fetchActiveSessionsCount(secondServerConfig, gameConfig.e2eUsername),
            {message: 'The logout ends the server-2 session', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(0);
    }

    static async fetchHousePlayerData(clientPage, secondServerConfig, playerName)
    {
        await Navigation.waitForRoom(clientPage, CrossServerHouseAssignment.SECOND_HOUSE, TimeConstants.ROOM_TRANSITION);
        let housePlayer = await GameplayE2eStateApi.fetchPlayer(
            secondServerConfig,
            CrossServerHouseAssignment.SECOND_HOUSE,
            playerName
        );
        expect(housePlayer.stats, 'The player is read on server-2: '+housePlayer.error).toBeTruthy();
        return {position: [housePlayer.x, housePlayer.y], hp: housePlayer.stats.hp};
    }

    static async runLogoutOnSecondServerTest(context)
    {
        let {page, gameConfig, longRun} = context;
        let playerName = gameConfig.e2ePlayerName;
        let secondServerConfig = await CrossServerHouseAssignment.assignHouseToSecondServer(context);
        await Login.loginRootPlayer(page, gameConfig, longRun);
        await CrossServerHouseAssignment.walkFromTown(context, CrossServerHouseAssignment.SECOND_HOUSE);
        let arrival = await CrossServerHouseAssignment.fetchHouseArrival(gameConfig);
        let arrived = await GameplayE2eStateApi.fetchPlayer(secondServerConfig, CrossServerHouseAssignment.SECOND_HOUSE, playerName);
        let expected = {
            position: [arrival.x + TestCrossServerSessions.PLACED_OFFSET, arrival.y],
            hp: arrived.stats.hp - TestCrossServerSessions.LOWERED_HP
        };
        await RoomMovementApi.placePlayer(secondServerConfig, CrossServerHouseAssignment.SECOND_HOUSE, playerName, {
            x: expected.position[0],
            y: expected.position[1]
        });
        await GameplayE2eStateApi.setPlayerStats(secondServerConfig, CrossServerHouseAssignment.SECOND_HOUSE, playerName, {
            hp: expected.hp
        });
        let storedUser = (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'users', {username: gameConfig.e2eUsername}))[0];
        await page.waitForTimeout(TestCrossServerSessions.PLAYED_MS);
        await TestCrossServerSessions.logoutFromSecondServer(page, gameConfig, secondServerConfig);
        await expect.poll(
            async () => Number(
                (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'users', {username: gameConfig.e2eUsername}))[0].played_time
            ),
            {message: 'The logout on server-2 stores the played time', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBeGreaterThan(Number(storedUser.played_time));
        await Login.loginRootPlayer(page, gameConfig, longRun);
        expect(
            await TestCrossServerSessions.fetchHousePlayerData(page, secondServerConfig, playerName),
            'The next login from the server-1 page starts in the server-2 room with the saved position and stats'
        ).toEqual(expected);
        await TestCrossServerSessions.logoutFromSecondServer(page, gameConfig, secondServerConfig);
        let secondClient = (await Login.openClientPage(page, secondServerConfig)).clientPage;
        await Login.loginRootPlayer(secondClient, secondServerConfig, longRun);
        expect(
            await TestCrossServerSessions.fetchHousePlayerData(secondClient, secondServerConfig, playerName),
            'The next login from the server-2 page starts in the server-2 room with the saved position and stats'
        ).toEqual(expected);
    }

    static async runSelectionEntersAfterSecondServerLoginTest(context)
    {
        let {page, gameConfig, longRun} = context;
        let secondServerConfig = await CrossServerHouseAssignment.assignHouseToSecondServer(context);
        await CrossServerHouseAssignment.storePlayerInHouse(context, gameConfig.e2ePlayerName, TestCrossServerSessions.PLACED_OFFSET);
        await Login.loginToSelection(page, gameConfig.e2eUsername, gameConfig.e2ePassword, longRun);
        let secondClient = (await Login.openClientPage(page, secondServerConfig)).clientPage;
        await Login.loginRootPlayer(secondClient, secondServerConfig, longRun);
        await Navigation.waitForRoom(secondClient, CrossServerHouseAssignment.SECOND_HOUSE, TimeConstants.ROOM_TRANSITION);
        await expect(
            page.locator(Selectors.reloadModal.message),
            'The login from the server-2 page ends the session left on the server-1 selection'
        ).toHaveText(GameTranslations.game.errors.sessionEnded, {timeout: TimeConstants.SERVER_RESPONSE});
        expect(
            (await LoginServerApi.fetchActiveSessions(secondServerConfig, gameConfig.e2eUsername)).rooms,
            'The session playing in the second house on server-2 stays'
        ).toContain(CrossServerHouseAssignment.SECOND_HOUSE);
    }

    static async runNoGameRoomVisitorTest(context)
    {
        let {page, secondPage, gameConfig, longRun} = context;
        await InitialClientConfig.override(page, TestCrossServerSessions.AUTO_CONNECT_PATH, false);
        await CrossServerHouseAssignment.assignHouseToSecondServer(context);
        await Login.loginRootPlayer(page, gameConfig, longRun);
        await CrossServerHouseAssignment.walkFromTown(context, CrossServerHouseAssignment.SECOND_HOUSE);
        expect(
            await page.evaluate(() => Object.keys(window.reldens.gameClient.gameRoomsByServer)),
            'With the auto connect off no server-2 game room is joined'
        ).toEqual([]);
        await Login.loginRootPlayer(secondPage, gameConfig, longRun);
        await TestCrossServerSessions.expectSessionEnded(page, 'The new login on server-1 ends the session visiting server-2');
        await Navigation.waitForRoom(secondPage, CrossServerHouseAssignment.SECOND_HOUSE, TimeConstants.ROOM_TRANSITION);
    }

    static async runContinuedLoginEndsOldSessionTest(context)
    {
        let {page, secondPage, gameConfig, longRun} = context;
        let playerName = gameConfig.e2ePlayerName;
        let secondServerConfig = await CrossServerHouseAssignment.assignHouseToSecondServer(context);
        await CrossServerHouseAssignment.keepUsersOnLeftServers(gameConfig, secondServerConfig);
        await CrossServerHouseAssignment.storePlayerInHouse(context, playerName, 0);
        let oldSessionPage = (await Login.openClientPage(page, secondServerConfig)).clientPage;
        await Login.loginRootPlayer(oldSessionPage, secondServerConfig, longRun);
        await Navigation.waitForRoom(oldSessionPage, CrossServerHouseAssignment.SECOND_HOUSE, TimeConstants.ROOM_TRANSITION);
        await Login.loginRootPlayer(secondPage, gameConfig, longRun);
        await Navigation.waitForRoom(secondPage, CrossServerHouseAssignment.SECOND_HOUSE, TimeConstants.ROOM_TRANSITION);
        await TestCrossServerSessions.expectSessionEnded(
            oldSessionPage,
            'The continued login on server-2 ends the old server-2 session of the same user'
        );
        expect(
            await LoginServerApi.fetchPlayersInRoom(secondServerConfig, CrossServerHouseAssignment.SECOND_HOUSE, playerName),
            'No ghost player of the old session stays in the second house'
        ).toBe(1);
    }

    static async expectSessionEnded(sessionPage, message)
    {
        await expect.poll(
            async () => sessionPage.evaluate(() => Boolean(window.reldens.gameOver)),
            {message, timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(true);
    }

    static async runRewardClaimedOnceTest(context)
    {
        let {page, gameConfig, e2eGroup} = context;
        let playerName = gameConfig.e2ePlayerName;
        let playerId = await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: playerName});
        for(let entityKey of ['itemsInventory', 'rewardsEventsState']){
            let ownerKey = 'itemsInventory' === entityKey ? 'owner_id' : 'player_id';
            await E2eSeedAndRestoreApi.preserveRows(gameConfig, e2eGroup, entityKey, {[ownerKey]: playerId});
        }
        let dailyReward = await RewardsSteps.fetchRewardEvent(gameConfig, RewardsSteps.DAILY_LOGIN);
        let rewardItems = sc.toJson(dailyReward.event_data, {}).items;
        let itemKey = Object.keys(rewardItems)[0];
        await CrossServerHouseAssignment.assignHouseToSecondServer(context);
        await Login.loginRootPlayer(page, gameConfig, context.longRun);
        let claimed = Number(await E2eSeedAndRestoreApi.fetchInventoryQuantity(gameConfig, playerName, itemKey))
            + Number(rewardItems[itemKey]);
        await RewardsSteps.claim({page}, [dailyReward.id]);
        await RewardsSteps.expectStoredState(gameConfig, playerId, dailyReward.id, {complete: true}, 'Claimed on server-1');
        await CrossServerHouseAssignment.walkFromTown(context, CrossServerHouseAssignment.SECOND_HOUSE);
        await RewardsSteps.claim({page}, [dailyReward.id]);
        await page.waitForTimeout(CrossServerHouseAssignment.QUIET_MS);
        expect(
            await E2eSeedAndRestoreApi.fetchInventoryQuantity(gameConfig, playerName, itemKey),
            'The reward claimed again on server-2 is not given a second time'
        ).toBe(claimed);
    }

    static run()
    {
        test.describe('Cross Server Sessions', () => {
            test('a login from a server-2 page ends the session left on the server-1 selection', async ({ page, gameConfig, e2eGroup, longRun }) => {
                test.setTimeout(TimeConstants.GAME_START * 3 + TimeConstants.ROOM_TRANSITION * 2);
                await TestCrossServerSessions.runSelectionEntersAfterSecondServerLoginTest({page, gameConfig, e2eGroup, longRun});
            });
            test('with no server-2 game room joined a new login on server-1 ends the session visiting server-2', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                test.setTimeout(TimeConstants.GAME_START * 3 + TimeConstants.ROOM_TRANSITION);
                await TestCrossServerSessions.runNoGameRoomVisitorTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('with the users kept on the server they leave a login on server-1 that moves to server-2 ends the old server-2 session', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerSessions.runContinuedLoginEndsOldSessionTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('a reward claimed on server-1 is not given again when claimed on server-2', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerSessions.runRewardClaimedOnceTest({page, gameConfig, e2eGroup, longRun});
            });
            test('a logout on server-2 saves the player there and the next login from either server starts there', async ({ page, gameConfig, e2eGroup, longRun }) => {
                test.setTimeout(TimeConstants.GAME_START * 3 + TimeConstants.ROOM_TRANSITION * 3);
                await TestCrossServerSessions.runLogoutOnSecondServerTest({page, gameConfig, e2eGroup, longRun});
            });
            test('the first move to server-2 in a session records no new login', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerSessions.runNoNewLoginOnMoveTest({page, gameConfig, e2eGroup, longRun});
            });
            test('a server-2 join forging a scene change for a player settled on server-1 ends its session as a new login', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerSessions.runForgedSceneChangeLoginTest({page, gameConfig, e2eGroup, longRun});
            });
            test('a second login from a server-2 page ends the server-1 session and starts on its saved position', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                test.setTimeout(TimeConstants.GAME_START * 3 + TimeConstants.ROOM_TRANSITION);
                await TestCrossServerSessions.runSecondLoginFromOtherServerTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestCrossServerSessions.run();
