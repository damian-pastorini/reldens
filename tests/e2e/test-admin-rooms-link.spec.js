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
 * The same arrival is checked on a town return tile picked away from the arrival points (the center of the tile the
 * form picker sends, a walkable tile with no room object within two tiles, since an NPC body pushes an arriving player
 * off its tile), alone and with a town change point linked to the bots house two rows above it (the town change points
 * and the bots house return points preserved too).
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
    static CLEAR_TILES_RADIUS = 6;
    static ARRIVAL_DISTANCE_TILES = 2;
    static CHANGE_POINT_ROWS_ABOVE = 2;
    static OBJECTS_CLEAR_DISTANCE = 64;

    static loadMapJson(roomName)
    {
        let mapJson = FileHandler.fetchFileJson(FileHandler.joinPaths(
            process.cwd(),
            'theme',
            'default',
            'assets',
            'maps',
            roomName+'.json'
        ));
        expect(mapJson, 'The '+roomName+' map json is readable').toBeTruthy();
        return mapJson;
    }

    static async findClearTownTiles(context, topology, arrivalPoint)
    {
        let {page, gameConfig, longRun} = context;
        await ChangePointsSteps.storeRoomArrival(context, topology, Login.TOWN_ROOM_NAME);
        await Login.loginRootPlayer(page, gameConfig, longRun);
        let {tilewidth, tileheight} = TestAdminRoomsLink.loadMapJson(Login.TOWN_ROOM_NAME);
        let arrivalTile = [Math.floor(arrivalPoint.x / tilewidth), Math.floor(arrivalPoint.y / tileheight)];
        let walkable = sc.get(
            await RoomMovementApi.fetchTiles(gameConfig, Login.TOWN_ROOM_NAME, arrivalTile, TestAdminRoomsLink.CLEAR_TILES_RADIUS),
            'walkable',
            []
        );
        let roomObjects = await RoomObjectsApi.fetchRoomObjects(gameConfig, Login.TOWN_ROOM_NAME);
        let isWalkable = (tile) => walkable.some(walkableTile => tile[0] === walkableTile[0] && tile[1] === walkableTile[1]);
        let returnTile = walkable.find(
            tile => TestAdminRoomsLink.ARRIVAL_DISTANCE_TILES <= Math.hypot(tile[0] - arrivalTile[0], tile[1] - arrivalTile[1])
                && isWalkable([tile[0], tile[1] - TestAdminRoomsLink.CHANGE_POINT_ROWS_ABOVE])
                && roomObjects.every(roomObject => TestAdminRoomsLink.OBJECTS_CLEAR_DISTANCE < Math.hypot(
                    roomObject.x - (tile[0] * tilewidth + tilewidth / 2),
                    roomObject.y - (tile[1] * tileheight + tileheight / 2)
                ))
        );
        expect(
            [0 < roomObjects.length, Boolean(returnTile)],
            'The town objects are loaded and a walkable town tile away from the arrival point has no room object within'
                +' two tiles (an NPC body pushes an arriving player off) and a walkable tile two rows above it'
        ).toEqual([true, true]);
        await page.reload();
        return {
            returnPoint: {x: returnTile[0] * tilewidth + tilewidth / 2, y: returnTile[1] * tileheight + tileheight / 2},
            changePointTile: [returnTile[0], returnTile[1] - TestAdminRoomsLink.CHANGE_POINT_ROWS_ABOVE]
        };
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

    static async linkTownToHouse(context, topology, townChangePointTile)
    {
        if(!townChangePointTile){
            return;
        }
        let {page, gameConfig, e2eGroup, longRun} = context;
        let houseId = topology.roomsIds[TestAdminRoomsLink.BOTS_HOUSE];
        let townId = topology.roomsIds[Login.TOWN_ROOM_NAME];
        await E2eSeedAndRestoreApi.preserveRows(gameConfig, e2eGroup, 'roomsChangePoints', {room_id: townId});
        await E2eSeedAndRestoreApi.preserveRows(gameConfig, e2eGroup, 'roomsReturnPoints', {room_id: houseId});
        let housePlayer = await GameplayE2eStateApi.fetchPlayer(gameConfig, TestAdminRoomsLink.BOTS_HOUSE, gameConfig.e2ePlayerName);
        await TestAdminRoomsLink.submitRoomsLink(page, gameConfig, longRun, {
            roomId: townId,
            tileIndex: townChangePointTile[1] * TestAdminRoomsLink.loadMapJson(Login.TOWN_ROOM_NAME).width
                + townChangePointTile[0],
            nextRoomId: houseId,
            x: housePlayer.x,
            y: housePlayer.y
        });
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
        let {x, y} = await GameplayE2eStateApi.fetchPlayer(gameConfig, Login.TOWN_ROOM_NAME, playerName);
        return [x, y];
    }

    static async runLinkedRoomsTest(context, linkCase)
    {
        let {page, gameConfig, e2eGroup, longRun} = context;
        let playerName = gameConfig.e2ePlayerName;
        let topology = await ChangePointsSteps.loadTopology(gameConfig);
        let houseId = topology.roomsIds[TestAdminRoomsLink.BOTS_HOUSE];
        let townId = topology.roomsIds[Login.TOWN_ROOM_NAME];
        let arrivalPoint = TestAdminRoomsLink.fetchPickedTownPoint(topology);
        let clearTiles = linkCase.clearTile
            ? await TestAdminRoomsLink.findClearTownTiles(context, topology, arrivalPoint)
            : false;
        let pickedPoint = clearTiles ? clearTiles.returnPoint : arrivalPoint;
        await E2eSeedAndRestoreApi.preserveRows(gameConfig, e2eGroup, 'roomsChangePoints', {room_id: houseId});
        await E2eSeedAndRestoreApi.preserveRows(gameConfig, e2eGroup, 'roomsReturnPoints', {room_id: townId});
        await ChangePointsSteps.storeRoomArrival(
            context,
            topology,
            TestAdminRoomsLink.BOTS_HOUSE,
            TestAdminRoomsLink.BOTS_FOREST
        );
        await Login.loginRootPlayer(page, gameConfig, longRun);
        await TestAdminRoomsLink.linkTownToHouse(
            context,
            topology,
            true === linkCase.withTownChangePoint && clearTiles.changePointTile
        );
        let changePointTile = await TestAdminRoomsLink.pickChangePointTile(gameConfig, playerName);
        let tileIndex = changePointTile[1] * TestAdminRoomsLink.loadMapJson(TestAdminRoomsLink.BOTS_HOUSE).width
            + changePointTile[0];
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
        let arrivalPosition = await TestAdminRoomsLink.fetchTownPosition(gameConfig, playerName);
        let {velocityX, velocityY, contacts} = await RoomMovementApi.fetchPlayer(gameConfig, Login.TOWN_ROOM_NAME, playerName);
        expect(
            arrivalPosition,
            'The player arrives standing on the picked town tile (its body velocity and contacts: '
                +sc.toJsonString({velocityX, velocityY, contacts})+')'
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
                await TestAdminRoomsLink.runLinkedRoomsTest({page, gameConfig, e2eGroup, longRun}, {});
            });
            test('a town return tile picked away from the arrival points is where the player arrives and stays', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestAdminRoomsLink.runLinkedRoomsTest({page, gameConfig, e2eGroup, longRun}, {clearTile: true});
            });
            test('a town return tile picked two rows below a town change point linked to the house is where the player arrives and stays', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestAdminRoomsLink.runLinkedRoomsTest(
                    {page, gameConfig, e2eGroup, longRun},
                    {clearTile: true, withTownChangePoint: true}
                );
            });
        });
    }

}

TestAdminRoomsLink.run();
