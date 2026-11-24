/**
 *
 * Reldens - Test Cross Server Admin Counts
 *
 * Tests the server-1 administration panel counts that add the other server report (exclusive group, the second house
 * stored with the server-2 address by CrossServerHouseAssignment and server-1 asking server-2 for its signed status):
 * with one player logged in directly on server-2 in the second house and one crossing there from a server-1 login,
 * the second house view banner and its refresh route show both players although server-1 has no instance of that room
 * (ISSUE #421); and the dashboard currently logged count adds the two users of server-2 (the one that crossed from a
 * server-1 login has no server-1 session left) to the town user of server-1 (ISSUE #422), and with the users kept on
 * the server they leave (server/players/disconnectUsersOnServerChange off on both servers) a user crossing to server-2
 * keeps its server-1 game room session and the dashboard still counts it once (ISSUE #473); a disposable room hosted on
 * server-2 and played there, deleted from the server-1 panel, is sent to server-2 that warns its player with the closing
 * countdown, shows the room closed modal and disposes the room, while a delete that fails on server-1 (the rooms
 * repository delete made to answer false) sends nothing and the server-2 room keeps running (ISSUE #420). The server-1
 * cached statuses are
 * expired on every read, so the counts follow the server-2 report of its next health check.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { CrossServerHouseAssignment } = require('./helpers/cross-server-house-assignment');
const { AdminPanelSession } = require('./helpers/admin-panel-session');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { LoginServerApi } = require('./helpers/login-server-api');
const { SecurityApi } = require('./helpers/security-api');
const { Navigation } = require('./helpers/navigation');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { E2eServerInstances } = require('./helpers/e2e-server-instances');
const { TestDataSetup } = require('./helpers/test-data-setup');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { Selectors } = require('./selectors');
const { ChatConst } = require('../../lib/chat/constants');
const GameTranslations = require('../../lib/game/client/snippets/en_US');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestCrossServerAdminCounts
{

    static BANNER_COUNT = '.room-active-players-banner .count-value';
    static CHECK_INTERVAL_PATH = 'server/health/checkIntervalMs';
    static CLOSE_SECONDS_PATH = 'server/rooms/deletion/closeActiveRoomsSeconds';
    static REMOTE_ROOM_NAME = TestDataSetup.disposableRoomName(TestDataSetup.REMOTE_ROOM_KEY);
    static ERROR_NOTIFICATION = '.notification.error .message';
    static STORAGE_FAILURE_RESULT = 'errorStorageFailure';

    static async prepareSecondHousePlayers(context)
    {
        let {page, secondPage, gameConfig, longRun} = context;
        let secondServerConfig = await CrossServerHouseAssignment.assignHouseToSecondServer(context);
        let remoteServers = await SecurityApi.request(gameConfig, 'POST', '/api/e2e/login-server/remote-servers', {});
        expect(remoteServers.remoteServersUrls, 'Server-1 asks server-2 for its status').toContain(
            secondServerConfig.serverBaseUrl
        );
        let houseArrival = await CrossServerHouseAssignment.storePlayerInHouse(context, gameConfig.e2ePlayerName3, 0);
        let secondServerPage = (await Login.openClientPage(page, secondServerConfig)).clientPage;
        await Login.loginRootPlayer(secondServerPage, secondServerConfig, longRun, '3');
        await Navigation.waitForRoom(secondServerPage, CrossServerHouseAssignment.SECOND_HOUSE, TimeConstants.ROOM_TRANSITION);
        await CrossServerHouseAssignment.storePlayerInHouse(context, gameConfig.e2ePlayerName2, Navigation.TILE_SIZE);
        await Login.loginRootPlayer(secondPage, gameConfig, longRun, '2');
        await Navigation.waitForRoom(secondPage, CrossServerHouseAssignment.SECOND_HOUSE, TimeConstants.ROOM_TRANSITION);
        await AdminPanelSession.loginAsAdmin(page, gameConfig, longRun);
        return {
            secondServerConfig,
            houseRoomId: houseArrival.roomId,
            reportTimeout: await TestCrossServerAdminCounts.fetchReportTimeout(gameConfig)
        };
    }

    static async fetchReportTimeout(gameConfig)
    {
        return TimeConstants.SERVER_RESPONSE + 2 * Number(
            await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, TestCrossServerAdminCounts.CHECK_INTERVAL_PATH)
        );
    }

    static async runUserOnBothServersCountedOnceTest(context)
    {
        let {page, secondPage, gameConfig, longRun} = context;
        let secondServerConfig = await CrossServerHouseAssignment.assignHouseToSecondServer(context);
        for(let serverConfig of [gameConfig, secondServerConfig]){
            expect(
                await LoginServerApi.setDisconnectUsersOnServerChange(serverConfig, false),
                'The server keeps the user logged on the server it leaves'
            ).toBe(false);
        }
        await CrossServerHouseAssignment.storePlayerInHouse(context, gameConfig.e2ePlayerName2, Navigation.TILE_SIZE);
        await Login.loginRootPlayer(secondPage, gameConfig, longRun, '2');
        await Navigation.waitForRoom(secondPage, CrossServerHouseAssignment.SECOND_HOUSE, TimeConstants.ROOM_TRANSITION);
        expect(
            await TestCrossServerAdminCounts.fetchSessionsCounts(context, secondServerConfig, [gameConfig.e2eUsername2]),
            'The user that crossed to server-2 keeps its server-1 game room session'
        ).toEqual([[true, true]]);
        await AdminPanelSession.loginAsAdmin(page, gameConfig, longRun);
        await expect.poll(
            async () => (await TestCrossServerAdminCounts.fetchAdminJson(page, gameConfig, '/dashboard/stats')).activeUsersCount,
            {
                message: 'The dashboard counts the user logged on both servers once (ISSUE #473)',
                timeout: await TestCrossServerAdminCounts.fetchReportTimeout(gameConfig)
            }
        ).toBe(1);
    }

    static async fetchAdminJson(page, gameConfig, routePath)
    {
        await SecurityApi.request(gameConfig, 'POST', '/api/e2e/login-server/remote-status', {expire: true});
        return await (await page.request.get(AdminPanelSession.adminPath(gameConfig)+routePath)).json();
    }

    static async fetchSessionsCounts(context, secondServerConfig, usernames)
    {
        let sessionsCounts = [];
        for(let username of usernames){
            sessionsCounts.push([
                await LoginServerApi.fetchActiveSessionsCount(context.gameConfig, username),
                await LoginServerApi.fetchActiveSessionsCount(secondServerConfig, username)
            ].map(sessionsCount => 0 < sessionsCount));
        }
        return sessionsCounts;
    }

    static async runRoomPlayersTest(context)
    {
        let {page, gameConfig} = context;
        let prepared = await TestCrossServerAdminCounts.prepareSecondHousePlayers(context);
        expect(
            await LoginServerApi.isRoomCreated(gameConfig, CrossServerHouseAssignment.SECOND_HOUSE),
            'Server-1 has no instance of the second house'
        ).toBe(false);
        await expect.poll(
            async () => (await TestCrossServerAdminCounts.fetchAdminJson(
                page,
                gameConfig,
                '/rooms/active-players?id='+prepared.houseRoomId
            )).count,
            {message: 'The refresh route counts the server-2 players of the second house', timeout: prepared.reportTimeout}
        ).toBe(2);
        await page.goto(AdminPanelSession.adminPath(gameConfig)+'/rooms/view?id='+prepared.houseRoomId);
        await expect(page.locator(TestCrossServerAdminCounts.BANNER_COUNT), 'The view banner shows the server-2 players')
            .toHaveText('2', {timeout: TimeConstants.SERVER_RESPONSE});
    }

    static async runLoggedUsersTest(context)
    {
        let {page, gameConfig, longRun} = context;
        let prepared = await TestCrossServerAdminCounts.prepareSecondHousePlayers(context);
        let townPage = (await Login.openClientPage(page, gameConfig)).clientPage;
        await Login.loginRootPlayer(townPage, gameConfig, longRun);
        await Navigation.waitForRoom(townPage, Login.TOWN_ROOM_NAME, TimeConstants.ROOM_TRANSITION);
        expect(
            await TestCrossServerAdminCounts.fetchSessionsCounts(context, prepared.secondServerConfig, [
                gameConfig.e2eUsername,
                gameConfig.e2eUsername2,
                gameConfig.e2eUsername3
            ]),
            'Sessions on server-1 and server-2: the town user on server-1, the user that crossed and the user logged on server-2'
        ).toEqual([[true, false], [false, true], [false, true]]);
        await expect.poll(
            async () => (await TestCrossServerAdminCounts.fetchAdminJson(page, gameConfig, '/dashboard/stats')).activeUsersCount,
            {message: 'The dashboard counts every logged user of both servers once', timeout: prepared.reportTimeout}
        ).toBe(3);
    }

    static async deleteRemoteRoom(context)
    {
        let {page, gameConfig, longRun} = context;
        let roomName = TestCrossServerAdminCounts.REMOTE_ROOM_NAME;
        let secondServerConfig = await CrossServerHouseAssignment.assignRoomsServersUrls(context, {
            [roomName]: E2eServerInstances.forServer(gameConfig, CrossServerHouseAssignment.SECOND_SERVER).serverBaseUrl,
            [Login.TOWN_ROOM_NAME]: E2eServerInstances.fetchAllServersUrls()[0]
        });
        let clientPage = (await Login.openClientPage(page, secondServerConfig)).clientPage;
        await Login.loginAndStartGame(
            clientPage,
            gameConfig.e2eUsername3,
            sc.get(gameConfig, 'e2ePassword3', gameConfig.e2ePassword),
            gameConfig.e2ePlayerName3,
            longRun,
            false,
            roomName
        );
        expect(
            {
                currentRoom: await Navigation.getCurrentRoomName(clientPage),
                onSecondServer: await LoginServerApi.isRoomCreated(secondServerConfig, roomName),
                onFirstServer: await LoginServerApi.isRoomCreated(gameConfig, roomName)
            },
            'The remote room is played on server-2 only'
        ).toEqual({currentRoom: roomName, onSecondServer: true, onFirstServer: false});
        await RoomMessagesRecorder.start(clientPage);
        await AdminPanelSession.loginAsAdmin(page, gameConfig, longRun);
        let roomId = await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'rooms', {name: roomName});
        await page.goto(AdminPanelSession.adminPath(gameConfig)+'/rooms/view?id='+roomId);
        await page.click(Selectors.admin.deleteTopButton);
        await page.locator(Selectors.admin.dialogConfirm+':visible').click();
        return {secondServerConfig, clientPage, roomName, roomId};
    }

    static async fetchClosingSeconds(clientPage)
    {
        return (await RoomMessagesRecorder.fetchMessages(clientPage, ChatConst.CHAT_ACTION))
            .filter(message => ChatConst.SNIPPETS.ROOM_CLOSING === message[ChatConst.MESSAGE.KEY])
            .map(message => message[ChatConst.MESSAGE.DATA.KEY][ChatConst.MESSAGE.DATA.SECONDS]);
    }

    static async runFailedRemoteDeleteTest(context)
    {
        let {page, gameConfig, e2eGroup, longRun} = context;
        await GameplayE2eStateApi.failEntityMethod(gameConfig, e2eGroup, 'rooms', 'delete', 1);
        let deleted = await TestCrossServerAdminCounts.deleteRemoteRoom(context);
        await expect(page.locator(TestCrossServerAdminCounts.ERROR_NOTIFICATION), 'The failed delete shows its error')
            .toContainText(TestCrossServerAdminCounts.STORAGE_FAILURE_RESULT, {timeout: TimeConstants.SERVER_RESPONSE});
        await deleted.clientPage.waitForTimeout(TimeConstants.forLongRun(TimeConstants.UI_OPEN, longRun));
        expect(
            {
                closingSeconds: await TestCrossServerAdminCounts.fetchClosingSeconds(deleted.clientPage),
                onSecondServer: await LoginServerApi.isRoomCreated(deleted.secondServerConfig, deleted.roomName),
                storedRooms: (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'rooms', {id: deleted.roomId})).length
            },
            'A failed delete on server-1 sends nothing: the server-2 room keeps running and its player is not warned'
        ).toEqual({closingSeconds: [], onSecondServer: true, storedRooms: 1});
    }

    static async runRemoteDeleteTest(context)
    {
        let {page, gameConfig, longRun} = context;
        let closeSeconds = Number(
            await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, TestCrossServerAdminCounts.CLOSE_SECONDS_PATH)
        );
        let deleted = await TestCrossServerAdminCounts.deleteRemoteRoom(context);
        await AdminPanelSession.expectSuccessNotification(page, longRun);
        await expect.poll(
            async () => await LoginServerApi.isRoomCreated(deleted.secondServerConfig, deleted.roomName),
            {message: 'Server-2 closes the room deleted on server-1', timeout: closeSeconds * 1000 + TimeConstants.SERVER_RESPONSE}
        ).toBe(false);
        await expect(deleted.clientPage.locator(Selectors.reloadModal.message), 'The server-2 player sees the room closed')
            .toHaveText(GameTranslations.game.errors.roomClosed, {timeout: TimeConstants.SERVER_RESPONSE});
        expect(
            {
                firstWarning: [...await TestCrossServerAdminCounts.fetchClosingSeconds(deleted.clientPage)].shift(),
                storedRooms: (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'rooms', {id: deleted.roomId})).length
            },
            'The server-2 player got the closing countdown and the room row is deleted'
        ).toEqual({firstWarning: closeSeconds, storedRooms: 0});
    }

    static run()
    {
        test.describe('Cross Server Admin Counts', () => {
            test('a room hosted on server-2 whose delete failed on server-1 keeps running on server-2', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerAdminCounts.runFailedRemoteDeleteTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('a room hosted on server-2 deleted on server-1 warns its server-2 players and closes there', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerAdminCounts.runRemoteDeleteTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('the view of a room hosted on server-2 counts the players server-2 has in it', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerAdminCounts.runRoomPlayersTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('the dashboard logged count adds the users logged on server-2 to the server-1 users', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerAdminCounts.runLoggedUsersTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('the dashboard logged count counts once a user kept logged on server-1 while it plays on server-2', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerAdminCounts.runUserOnBothServersCountedOnceTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestCrossServerAdminCounts.run();
