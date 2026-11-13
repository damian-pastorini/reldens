/**
 *
 * Reldens - Test Admin Rooms Live Deletion
 *
 * Tests the rooms deleted from the administration panel on the running server: the room view banner counts the players
 * that join and leave the room, the default room delete is blocked on the view, on the list row and on the selection
 * without any request sent, a room deleted with two players inside warns them with the closing countdown and shows them
 * only the room closed modal while a player in another room keeps playing and the stored player of the deleted room
 * logs in to the default room, and a room deleted with the relocation disabled unlinks its stored player. The deleted
 * rooms are town houses no other spec uses, a deleted room is defined again only when the server restarts.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { AdminPanelSession } = require('./helpers/admin-panel-session');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { Login } = require('./helpers/login');
const { LoginServerApi } = require('./helpers/login-server-api');
const { Navigation } = require('./helpers/navigation');
const { ParallelSpecGroups } = require('./helpers/parallel-spec-groups');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { RoomsConst } = require('../../lib/rooms/constants');
const { ChatConst } = require('../../lib/chat/constants');
const GameTranslations = require('../../lib/game/client/snippets/en_US');
const { ServerPathResolver } = require('../server-path-resolver');
const { FileHandler } = require('@reldens/server-utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAdminRoomsLiveDeletion
{

    static PLAYERS_ROOM_NAME = 'reldens-new-age-town-house-05';
    static UNLINKED_ROOM_NAME = 'reldens-new-age-town-house-04';
    static DELETED_ROOMS_FILES = [
        TestAdminRoomsLiveDeletion.PLAYERS_ROOM_NAME+'.json',
        TestAdminRoomsLiveDeletion.PLAYERS_ROOM_NAME+'.png',
        TestAdminRoomsLiveDeletion.UNLINKED_ROOM_NAME+'.json',
        TestAdminRoomsLiveDeletion.UNLINKED_ROOM_NAME+'.png'
    ];
    static OFFLINE_USERS_SET = 1;
    static DEFAULT_CLOSE_SECONDS = 10;
    static CLOSING_COUNTDOWN = [10, 5, 4, 3, 2, 1];
    static BANNER = '.room-active-players-banner';
    static BANNER_COUNT = '.room-active-players-banner .count-value';
    static BANNER_WARNING = '.room-active-players-warning';
    static VISIBLE_DIALOG_MESSAGE = '.confirm-dialog:visible .dialog-message';
    static VISIBLE_DIALOG_CANCEL = '.confirm-dialog .dialog-cancel:visible';
    static DEFAULT_ROOM_WARNING = 'you need to set another room as default first';
    static ACTIVE_PLAYERS_WARNING = 'This room has players in it right now.';
    static DELETE_CONFIRMATION = 'Are you sure you want to delete?';

    static async openRoomView(page, gameConfig, longRun, roomId)
    {
        await AdminPanelSession.loginAsAdmin(page, gameConfig, longRun);
        await page.goto(AdminPanelSession.adminPath(gameConfig)+'/rooms/view?id='+roomId);
        await expect(page.locator(TestAdminRoomsLiveDeletion.BANNER_COUNT)).toBeVisible(
            {timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun)}
        );
    }

    static async startClientInRoom(page, gameConfig, longRun, userKeySuffix, roomName)
    {
        let client = await Login.openClientPage(page, gameConfig);
        await Login.loginAndStartGame(
            client.clientPage,
            gameConfig['e2eUsername'+userKeySuffix],
            gameConfig['e2ePassword'+userKeySuffix] || gameConfig.e2ePassword,
            gameConfig['e2ePlayerName'+userKeySuffix],
            longRun,
            false,
            roomName
        );
        expect(await Navigation.getCurrentRoomName(client.clientPage), 'The player starts in '+roomName).toBe(roomName);
        return client;
    }

    static async expectBannerCount(page, expectedCount, refreshTimeout)
    {
        await expect(page.locator(TestAdminRoomsLiveDeletion.BANNER_COUNT)).toHaveText(String(expectedCount), {
            timeout: refreshTimeout
        });
    }

    static async runBannerTest(page, screenshots, gameConfig, longRun)
    {
        let roomName = TestAdminRoomsLiveDeletion.PLAYERS_ROOM_NAME;
        await TestAdminRoomsLiveDeletion.openRoomView(
            page,
            gameConfig,
            longRun,
            await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'rooms', {name: roomName})
        );
        let refreshTimeout = Number(await page.locator(TestAdminRoomsLiveDeletion.BANNER).getAttribute('data-refresh-ms'))
            + TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun);
        let warning = page.locator(TestAdminRoomsLiveDeletion.BANNER_WARNING);
        await TestAdminRoomsLiveDeletion.expectBannerCount(page, 0, refreshTimeout);
        await expect(warning, 'No players warning').toBeHidden();
        await TestAdminRoomsLiveDeletion.startClientInRoom(page, gameConfig, longRun, '', roomName);
        await TestAdminRoomsLiveDeletion.expectBannerCount(page, 1, refreshTimeout);
        let secondClient = await TestAdminRoomsLiveDeletion.startClientInRoom(page, gameConfig, longRun, '2', roomName);
        await TestAdminRoomsLiveDeletion.expectBannerCount(page, 2, refreshTimeout);
        await expect(warning, 'Active players warning').toBeVisible();
        await screenshots.capture(page, 'room-view-banner-two-players');
        await secondClient.clientContext.close();
        await TestAdminRoomsLiveDeletion.expectBannerCount(page, 1, refreshTimeout);
    }

    static async expectDefaultRoomWarning(page, longRun, deleteAction)
    {
        await deleteAction();
        await expect(page.locator(TestAdminRoomsLiveDeletion.VISIBLE_DIALOG_MESSAGE)).toContainText(
            TestAdminRoomsLiveDeletion.DEFAULT_ROOM_WARNING,
            {timeout: TimeConstants.forLongRun(TimeConstants.UI_OPEN, longRun)}
        );
        await expect(page.locator(Selectors.admin.dialogConfirm), 'The delete can not be confirmed').toBeHidden();
        await page.locator(TestAdminRoomsLiveDeletion.VISIBLE_DIALOG_CANCEL).click();
    }

    static async runDefaultRoomBlockedTest(page, screenshots, gameConfig, longRun)
    {
        let defaultRoomId = Number(
            await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, 'server/'+RoomsConst.DEFAULT_ROOM_CONFIG_PATH)
        );
        let deleteRequests = [];
        page.on('request', (request) => -1 !== request.url().indexOf('/rooms/delete') && deleteRequests.push(request.url()));
        await TestAdminRoomsLiveDeletion.openRoomView(page, gameConfig, longRun, defaultRoomId);
        await TestAdminRoomsLiveDeletion.expectDefaultRoomWarning(page, longRun, () => page.click(Selectors.admin.deleteTopButton));
        await page.goto(AdminPanelSession.adminPath(gameConfig)+'/rooms');
        await TestAdminRoomsLiveDeletion.expectDefaultRoomWarning(
            page,
            longRun,
            () => page.click('#delete-form-'+defaultRoomId+' .button-list-delete')
        );
        await TestAdminRoomsLiveDeletion.expectDefaultRoomWarning(page, longRun, async () => {
            await page.locator('.ids-checkbox[value="'+defaultRoomId+'"]').check();
            await page.click('.list-delete-selection');
        });
        await screenshots.capture(page, 'default-room-delete-blocked');
        expect(deleteRequests, 'No delete request must be sent').toEqual([]);
        expect((await E2eSeedAndRestoreApi.loadRows(gameConfig, 'rooms', {id: defaultRoomId})).length, 'Room kept').toBe(1);
    }

    static async preserveOfflinePlayerInRoom(gameConfig, e2eGroup, roomId)
    {
        let offlineUser = [...ParallelSpecGroups.fetchSetUsers(gameConfig, TestAdminRoomsLiveDeletion.OFFLINE_USERS_SET)].shift();
        await E2eSeedAndRestoreApi.updateWithPreserve(
            gameConfig,
            e2eGroup,
            'playersState',
            {player_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: offlineUser.playerName})},
            {room_id: roomId}
        );
        return offlineUser;
    }

    static restoreDeletedRoomsFiles(gameConfig)
    {
        let defaultMapsPath = FileHandler.joinPaths(process.cwd(), 'theme', 'default', 'assets', 'maps');
        let testedMapsPath = FileHandler.joinPaths(
            ServerPathResolver.resolve(gameConfig.serverPath),
            'theme',
            gameConfig.themeName,
            'assets',
            'maps'
        );
        let restoredFiles = [];
        for(let fileName of TestAdminRoomsLiveDeletion.DELETED_ROOMS_FILES){
            if(FileHandler.copyFile(FileHandler.joinPaths(defaultMapsPath, fileName), FileHandler.joinPaths(testedMapsPath, fileName))){
                restoredFiles.push(fileName);
            }
        }
        expect(restoredFiles, 'The deleted rooms map files are restored').toEqual(TestAdminRoomsLiveDeletion.DELETED_ROOMS_FILES);
    }

    static async deleteRoomFromView(page, longRun, expectedWarning)
    {
        await page.click(Selectors.admin.deleteTopButton);
        await expect(page.locator(TestAdminRoomsLiveDeletion.VISIBLE_DIALOG_MESSAGE)).toContainText(expectedWarning, {
            timeout: TimeConstants.forLongRun(TimeConstants.UI_OPEN, longRun)
        });
        await page.locator(Selectors.admin.dialogConfirm+':visible').click();
        await expect(page).toHaveURL(/\/rooms\?result=success/, {
            timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun)
        });
    }

    static async recordReloadMessages(clientPage)
    {
        await RoomMessagesRecorder.start(clientPage);
        await clientPage.evaluate(() => {
            window.e2eReloadMessages = [];
            new MutationObserver(() => {
                let messageElement = document.querySelector('.reload-modal-message');
                let shownMessage = messageElement ? messageElement.textContent : '';
                if('' !== shownMessage && shownMessage !== [...window.e2eReloadMessages].pop()){
                    window.e2eReloadMessages.push(shownMessage);
                }
            }).observe(document.body, {childList: true, characterData: true, subtree: true});
        });
    }

    static async fetchClientResult(clientPage)
    {
        return {
            closingSeconds: (await RoomMessagesRecorder.fetchMessages(clientPage, ChatConst.CHAT_ACTION))
                .filter(message => ChatConst.SNIPPETS.ROOM_CLOSING === message[ChatConst.MESSAGE.KEY])
                .map(message => message[ChatConst.MESSAGE.DATA.KEY][ChatConst.MESSAGE.DATA.SECONDS]),
            reloadMessages: await clientPage.evaluate(() => window.e2eReloadMessages)
        };
    }

    static async runPlayersRoomDeletedTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let roomName = TestAdminRoomsLiveDeletion.PLAYERS_ROOM_NAME;
        let roomId = await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'rooms', {name: roomName});
        let offlineUser = await TestAdminRoomsLiveDeletion.preserveOfflinePlayerInRoom(gameConfig, e2eGroup, roomId);
        let clients = [
            await TestAdminRoomsLiveDeletion.startClientInRoom(page, gameConfig, longRun, '', roomName),
            await TestAdminRoomsLiveDeletion.startClientInRoom(page, gameConfig, longRun, '2', roomName),
            await TestAdminRoomsLiveDeletion.startClientInRoom(page, gameConfig, longRun, '3', Login.TOWN_ROOM_NAME)
        ];
        for(let client of clients){
            await TestAdminRoomsLiveDeletion.recordReloadMessages(client.clientPage);
        }
        await TestAdminRoomsLiveDeletion.openRoomView(page, gameConfig, longRun, roomId);
        await TestAdminRoomsLiveDeletion.deleteRoomFromView(page, longRun, TestAdminRoomsLiveDeletion.ACTIVE_PLAYERS_WARNING);
        let closeTimeout = TestAdminRoomsLiveDeletion.DEFAULT_CLOSE_SECONDS * 1000
            + TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun);
        await expect.poll(async () => await LoginServerApi.isRoomCreated(gameConfig, roomName), {timeout: closeTimeout}).toBe(false);
        await expect(clients[0].clientPage.locator(Selectors.reloadModal.message)).toHaveText(
            GameTranslations.game.errors.roomClosed,
            {timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun)}
        );
        await clients[0].clientPage.waitForTimeout(TimeConstants.forLongRun(TimeConstants.UI_OPEN, longRun));
        let roomResult = {
            closingSeconds: TestAdminRoomsLiveDeletion.CLOSING_COUNTDOWN,
            reloadMessages: [GameTranslations.game.errors.roomClosed]
        };
        let clientsResults = [];
        for(let client of clients){
            clientsResults.push(await TestAdminRoomsLiveDeletion.fetchClientResult(client.clientPage));
        }
        expect(clientsResults, 'Warned room players, untouched town player').toEqual(
            [roomResult, roomResult, {closingSeconds: [], reloadMessages: []}]
        );
        expect(await Navigation.getCurrentRoomName(clients[2].clientPage), 'The town player keeps playing').toBe(
            Login.TOWN_ROOM_NAME
        );
        await screenshots.capture(clients[0].clientPage, 'deleted-room-closed-modal');
        expect((await E2eSeedAndRestoreApi.loadRows(gameConfig, 'rooms', {id: roomId})).length, 'Room deleted').toBe(0);
        expect((await E2eSeedAndRestoreApi.fetchPlayerState(gameConfig, offlineUser.playerName)).room_id, 'Stored player moved').toBe(
            Number(await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, 'server/'+RoomsConst.DEFAULT_ROOM_CONFIG_PATH))
        );
        let offlineClient = await Login.openClientPage(page, gameConfig);
        await Login.loginAndStartGame(offlineClient.clientPage, offlineUser.username, gameConfig.e2ePassword, offlineUser.playerName, longRun);
        expect(await Navigation.getCurrentRoomName(offlineClient.clientPage), 'Stored player logs in the default room').toBe(
            Login.TOWN_ROOM_NAME
        );
    }

    static async runUnlinkedRoomDeletedTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let roomName = TestAdminRoomsLiveDeletion.UNLINKED_ROOM_NAME;
        let roomId = await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'rooms', {name: roomName});
        await E2eSeedAndRestoreApi.overrideConfig(gameConfig, e2eGroup, 'server/rooms/deletion/setDefault', false);
        let offlineUser = await TestAdminRoomsLiveDeletion.preserveOfflinePlayerInRoom(gameConfig, e2eGroup, roomId);
        await TestAdminRoomsLiveDeletion.openRoomView(page, gameConfig, longRun, roomId);
        await TestAdminRoomsLiveDeletion.deleteRoomFromView(page, longRun, TestAdminRoomsLiveDeletion.DELETE_CONFIRMATION);
        expect(
            [
                (await E2eSeedAndRestoreApi.fetchPlayerState(gameConfig, offlineUser.playerName)).room_id,
                await LoginServerApi.isRoomCreated(gameConfig, roomName)
            ],
            'Stored player unlinked and no room instance'
        ).toEqual([null, false]);
        await screenshots.capture(page, 'unlinked-room-deleted');
    }

    static run()
    {
        test.describe('Admin Rooms Live Deletion', () => {
            test.afterEach(async ({ gameConfig }) => {
                TestAdminRoomsLiveDeletion.restoreDeletedRoomsFiles(gameConfig);
            });
            test('the room view banner counts the players that join and leave the room', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAdminRoomsLiveDeletion.runBannerTest(page, screenshots, gameConfig, longRun);
            });
            test('the default room delete is blocked in the panel without any request', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAdminRoomsLiveDeletion.runDefaultRoomBlockedTest(page, screenshots, gameConfig, longRun);
            });
            test('a room deleted with players inside warns them, closes the room and relocates its stored player', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAdminRoomsLiveDeletion.runPlayersRoomDeletedTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('a room deleted with the relocation disabled unlinks its stored player', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAdminRoomsLiveDeletion.runUnlinkedRoomDeletedTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
        });
    }

}

TestAdminRoomsLiveDeletion.run();
