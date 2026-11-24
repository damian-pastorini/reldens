/**
 *
 * Reldens - Test Admin Rooms Link
 *
 * Tests the rooms linked from the administration rooms view Link rooms form (exclusive group, the change points of the
 * bots house and the return points of the town preserved and restored, with the stored rooms reloaded again by the
 * group reset): the bots house is linked to the town with a change point on a walkable tile next to the player and the
 * return tile picked on a town tile where the players arrive from another room (the tile center the form picker sends),
 * the stored rooms are reloaded like a server restart, which disposes the bots house with the player in it, and the
 * player logged in again walks through the new change point, arrives standing on the picked town tile and stays there.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { AdminPanelSession } = require('./helpers/admin-panel-session');
const { ChangePointsSteps } = require('./helpers/change-points-steps');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { RoomMovementApi } = require('./helpers/room-movement-api');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { SecurityApi } = require('./helpers/security-api');
const { WalkableTileLocator } = require('./helpers/walkable-tile-locator');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { FileHandler } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAdminRoomsLink
{

    static BOTS_HOUSE = 'reldens-bots-forest-house-01-n0';
    static BOTS_FOREST = 'reldens-bots-forest';
    static CHANGE_POINT_OFFSET = [2, 0];
    static TILES_RADIUS = 3;
    static QUIET_MS = 1500;

    static loadHouseMapWidth()
    {
        let mapJson = FileHandler.fetchFileJson(FileHandler.joinPaths(
            process.cwd(),
            'theme',
            'default',
            'assets',
            'maps',
            TestAdminRoomsLink.BOTS_HOUSE+'.json'
        ));
        expect(mapJson, 'The bots house map json is readable').toBeTruthy();
        return mapJson.width;
    }

    static fetchPickedTownPoint(topology)
    {
        let townId = topology.roomsIds[Login.TOWN_ROOM_NAME];
        let pickedPoint = topology.returnPoints.find(
            row => townId === Number(row.room_id) && null !== row.from_room_id
        );
        expect(pickedPoint, 'A town tile where the players arrive from another room').toBeTruthy();
        return pickedPoint;
    }

    static async pickChangePointTile(gameConfig, playerName)
    {
        let player = await RoomMovementApi.fetchPlayer(gameConfig, TestAdminRoomsLink.BOTS_HOUSE, playerName);
        let playerTile = [player.currentCol, player.currentRow];
        let tiles = await RoomMovementApi.fetchTiles(
            gameConfig,
            TestAdminRoomsLink.BOTS_HOUSE,
            playerTile,
            TestAdminRoomsLink.TILES_RADIUS
        );
        let changePointTile = WalkableTileLocator.findWalkableNearOffset(
            tiles,
            playerTile,
            TestAdminRoomsLink.CHANGE_POINT_OFFSET
        );
        expect(changePointTile, 'A walkable bots house tile next to the player: '+sc.toJsonString(playerTile)).toBeTruthy();
        return changePointTile;
    }

    static async submitRoomsLink(page, gameConfig, longRun, linkForm)
    {
        let adminPage = await page.context().newPage();
        await AdminPanelSession.loginAsAdmin(adminPage, gameConfig, longRun);
        let response = await adminPage.request.post(
            AdminPanelSession.adminPath(gameConfig)+'/rooms/view?id='+linkForm.roomId,
            {
                form: {
                    _csrf: await AdminPanelSession.fetchCsrfToken(adminPage),
                    createRoomsLink: '1',
                    currentRoomChangePointTileIndex: String(linkForm.tileIndex),
                    nextRoomSelector: String(linkForm.nextRoomId),
                    nextRoomPositionX: String(linkForm.x),
                    nextRoomPositionY: String(linkForm.y),
                    nextRoomDirection: 'down',
                    nextRoomIsDefault: '0'
                },
                maxRedirects: 0
            }
        );
        let redirectLocation = sc.get(response.headers(), 'location', '');
        expect(
            new URL(redirectLocation, adminPage.url()).searchParams.get('result'),
            'The Link rooms form result of the redirect '+redirectLocation
        ).toBe('success');
        await adminPage.close();
    }

    static async fetchTownPosition(gameConfig, playerName)
    {
        let townPlayer = await GameplayE2eStateApi.fetchPlayer(gameConfig, Login.TOWN_ROOM_NAME, playerName);
        return [townPlayer.x, townPlayer.y];
    }

    static async runLinkedRoomsTest(context)
    {
        let {page, gameConfig, e2eGroup, longRun} = context;
        let playerName = gameConfig.e2ePlayerName;
        let topology = await ChangePointsSteps.loadTopology(gameConfig);
        let houseId = topology.roomsIds[TestAdminRoomsLink.BOTS_HOUSE];
        let townId = topology.roomsIds[Login.TOWN_ROOM_NAME];
        let pickedPoint = TestAdminRoomsLink.fetchPickedTownPoint(topology);
        await E2eSeedAndRestoreApi.preserveRows(gameConfig, e2eGroup, 'roomsChangePoints', {room_id: houseId});
        await E2eSeedAndRestoreApi.preserveRows(gameConfig, e2eGroup, 'roomsReturnPoints', {room_id: townId});
        await ChangePointsSteps.storeRoomArrival(
            context,
            topology,
            TestAdminRoomsLink.BOTS_HOUSE,
            TestAdminRoomsLink.BOTS_FOREST
        );
        await Login.loginRootPlayer(page, gameConfig, longRun);
        let changePointTile = await TestAdminRoomsLink.pickChangePointTile(gameConfig, playerName);
        let tileIndex = changePointTile[1] * TestAdminRoomsLink.loadHouseMapWidth() + changePointTile[0];
        await TestAdminRoomsLink.submitRoomsLink(page, gameConfig, longRun, {
            roomId: houseId,
            tileIndex,
            nextRoomId: townId,
            x: pickedPoint.x,
            y: pickedPoint.y
        });
        await SecurityApi.request(gameConfig, 'POST', '/api/e2e/data/reload-rooms', {
            group: e2eGroup,
            roomsNames: [TestAdminRoomsLink.BOTS_HOUSE, Login.TOWN_ROOM_NAME]
        });
        await page.reload();
        await Login.loginRootPlayer(page, gameConfig, longRun);
        let houseChangePoint = (await RoomObjectsApi.fetchChangePoints(gameConfig, TestAdminRoomsLink.BOTS_HOUSE))
            .changePoints.find(changePoint => String(tileIndex) === String(changePoint.tileIndex));
        expect(
            houseChangePoint && [houseChangePoint.created, houseChangePoint.nextRoomName],
            'The linked change point gets its body on the bots house reloaded after the link'
        ).toEqual([true, Login.TOWN_ROOM_NAME]);
        await ChangePointsSteps.changeRoom(
            context,
            {page, playerName},
            await ChangePointsSteps.loadTopology(gameConfig),
            {roomName: TestAdminRoomsLink.BOTS_HOUSE, nextRoomName: Login.TOWN_ROOM_NAME, tileIndex: String(tileIndex)}
        );
        let pickedPosition = [Number(pickedPoint.x), Number(pickedPoint.y)];
        expect(
            await TestAdminRoomsLink.fetchTownPosition(gameConfig, playerName),
            'The player arrives standing on the picked town tile'
        ).toEqual(pickedPosition);
        await page.waitForTimeout(TestAdminRoomsLink.QUIET_MS);
        expect(
            await TestAdminRoomsLink.fetchTownPosition(gameConfig, playerName),
            'The player stays on the picked town tile'
        ).toEqual(pickedPosition);
    }

    static run()
    {
        test.describe('Admin Rooms Link', () => {
            test('rooms linked from the admin Link rooms form and reloaded arrive standing on the picked return tile', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestAdminRoomsLink.runLinkedRoomsTest({page, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestAdminRoomsLink.run();
