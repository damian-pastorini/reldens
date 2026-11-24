/**
 *
 * Reldens - Test Cross Server Moves
 *
 * Tests the moves of a player between two servers (exclusive group, the second house on server-2 and the town on
 * server-1 set by CrossServerHouseAssignment): a player of server-1 crossing the town door of the second house arrives
 * in that house on server-2 on the return point of the town with no session ended modal; the moves town, house, town,
 * house, town end on the town return point with no modal; a town observer removes the moving player and a house
 * observer (logged in from server-1 into the house) shows it with its name; the town left empty is disposed after the
 * dispose timeout, like a town left for a server-1 house; a login from the server-1 page with the last room on server-2
 * starts there, and the second house picked in the login room selector starts there on its default return point; a
 * player of the selection whose second house join is rejected by server-2 (the house stored with the 127.0.0.1 host
 * alias of server-2, refused by its room server check, and server-1 sending its disconnect requests to the server-2
 * address) shows the selection error, and the next player of the user selected enters the town on server-1 with no
 * server-2 room left open on the client or on server-2; and
 * server-1 logs the user out of every room once it moved (the player data kept between the servers
 * is tested in test-cross-server-player-data.spec.js).
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { ChangePointsSteps } = require('./helpers/change-points-steps');
const { CrossServerHouseAssignment } = require('./helpers/cross-server-house-assignment');
const { CharacterCreation } = require('./helpers/character-creation');
const { E2eServerInstances } = require('./helpers/e2e-server-instances');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { LoginServerApi } = require('./helpers/login-server-api');
const { Navigation } = require('./helpers/navigation');
const { SceneSpritesRecorder } = require('./helpers/scene-sprites-recorder');
const { Login } = require('./helpers/login');
const { TeleportNpcSteps } = require('./helpers/teleport-npc-steps');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { GameConst } = require('../../lib/game/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestCrossServerMoves
{

    static SECOND_HOUSE = CrossServerHouseAssignment.SECOND_HOUSE;
    static FIRST_HOUSE = 'reldens-house-1';
    static OBSERVER_OFFSET = 64;
    static DISPOSE_TIMEOUT_MS = 1000;
    static READ_OPEN_OTHER_SERVER_ROOMS = () => {
        let gameClient = window.reldens.gameClient;
        let serverRooms = Object.keys(gameClient.gameRoomsByServer).map(serverUrl => gameClient.gameRoomsByServer[serverUrl]);
        for(let serverUrl of Object.keys(gameClient.featuresRoomsByServer)){
            let featureRooms = gameClient.featuresRoomsByServer[serverUrl];
            serverRooms.push(...Object.keys(featureRooms).map(roomName => featureRooms[roomName]));
        }
        return serverRooms.filter(room => room?.connection?.isOpen).length;
    };

    static async moveFromTown(context, nextRoomName)
    {
        let {page, gameConfig} = context;
        let secondServerConfig = await CrossServerHouseAssignment.assignHouseToSecondServer(context);
        await Login.loginRootPlayer(page, gameConfig, context.longRun);
        await CrossServerHouseAssignment.walkFromTown(context, nextRoomName);
        return secondServerConfig;
    }

    static async runCrossToSecondServerTest(context)
    {
        let {page, gameConfig} = context;
        let secondServerConfig = await TestCrossServerMoves.moveFromTown(context, TestCrossServerMoves.SECOND_HOUSE);
        let arrival = await CrossServerHouseAssignment.fetchHouseArrival(gameConfig);
        let arrived = await CrossServerHouseAssignment.fetchHouseArrivalState(page, secondServerConfig, gameConfig.e2ePlayerName);
        expect(
            {
                clientRoom: await Navigation.getCurrentRoomName(page),
                isGameOver: arrived.isGameOver,
                position: [arrived.housePlayer.x, arrived.housePlayer.y]
            },
            'The player arrives in the second house on server-2 with no session ended modal: '+arrived.housePlayer.error
        ).toEqual({clientRoom: TestCrossServerMoves.SECOND_HOUSE, isGameOver: false, position: [arrival.x, arrival.y]});
    }

    static async runRoundTripsTest(context)
    {
        let {page, gameConfig} = context;
        let player = {page, playerName: gameConfig.e2ePlayerName};
        let secondServerConfig = await CrossServerHouseAssignment.assignHouseToSecondServer(context);
        await Login.loginRootPlayer(page, gameConfig, context.longRun);
        let topology = await ChangePointsSteps.loadTopology(gameConfig);
        let [toHouse, backToTown] = ChangePointsSteps.buildRoundTrips(
            topology,
            Login.TOWN_ROOM_NAME,
            TestCrossServerMoves.SECOND_HOUSE
        );
        let serversByRoom = {
            [Login.TOWN_ROOM_NAME]: gameConfig,
            [TestCrossServerMoves.SECOND_HOUSE]: secondServerConfig
        };
        let gameOverStates = [];
        for(let change of [toHouse, backToTown, toHouse, backToTown]){
            await ChangePointsSteps.changeRoom(
                Object.assign({}, context, {gameConfig: serversByRoom[change.roomName]}),
                player,
                topology,
                change
            );
            gameOverStates.push(await page.evaluate(() => Boolean(window.reldens.gameOver)));
        }
        let townPlayer = await GameplayE2eStateApi.fetchPlayer(gameConfig, Login.TOWN_ROOM_NAME, player.playerName);
        let arrival = ChangePointsSteps.fetchArrival(topology, Login.TOWN_ROOM_NAME, TestCrossServerMoves.SECOND_HOUSE);
        expect(
            {gameOverStates, position: [townPlayer.x, townPlayer.y]},
            'The moves town, house, town, house, town between the servers end on the town return point with no modal: '
                +townPlayer.error
        ).toEqual({gameOverStates: [false, false, false, false], position: [arrival.x, arrival.y]});
    }

    static async runObserversTest(context)
    {
        let {page, secondPage, gameConfig} = context;
        await CrossServerHouseAssignment.assignHouseToSecondServer(context);
        let houseObserver = await CrossServerHouseAssignment.loginHouseObserver(context, TestCrossServerMoves.OBSERVER_OFFSET);
        let townSessionId = await CrossServerHouseAssignment.loginWithTownObserver(context);
        let topology = await ChangePointsSteps.loadTopology(gameConfig);
        await ChangePointsSteps.enterNextRoom(
            context,
            {page, playerName: gameConfig.e2ePlayerName},
            ChangePointsSteps.buildWalk(topology, [Login.TOWN_ROOM_NAME, TestCrossServerMoves.SECOND_HOUSE])[0]
        );
        let houseSessionId = await page.evaluate(CrossServerHouseAssignment.READ_SESSION_ID);
        await SceneSpritesRecorder.waitForRemovedPlayer(secondPage, townSessionId, TimeConstants.SERVER_RESPONSE);
        await SceneSpritesRecorder.waitForShownPlayer(houseObserver, houseSessionId, TimeConstants.SERVER_RESPONSE);
        expect(
            {
                shownName: await houseObserver.evaluate(
                    (sessionId) => window.reldens.getCurrentPlayer().players[sessionId].nameSprite?.text,
                    houseSessionId
                ),
                gameOverStates: [
                    await page.evaluate(() => Boolean(window.reldens.gameOver)),
                    await secondPage.evaluate(() => Boolean(window.reldens.gameOver)),
                    await houseObserver.evaluate(() => Boolean(window.reldens.gameOver))
                ]
            },
            'The town observer removed the player, the house observer on server-2 shows it with its name, no modal'
        ).toEqual({shownName: gameConfig.e2ePlayerName, gameOverStates: [false, false, false]});
    }

    static async runLeftRoomDisposeTest(context, nextRoomName)
    {
        let {gameConfig, e2eGroup} = context;
        await E2eSeedAndRestoreApi.overrideConfig(
            gameConfig,
            e2eGroup,
            'server/rooms/disposeTimeout',
            TestCrossServerMoves.DISPOSE_TIMEOUT_MS
        );
        await TestCrossServerMoves.moveFromTown(context, nextRoomName);
        await expect.poll(
            async () => LoginServerApi.isRoomCreated(gameConfig, Login.TOWN_ROOM_NAME),
            {
                message: 'The town on server-1 is disposed once its last player moved to '+nextRoomName,
                timeout: TimeConstants.SERVER_RESPONSE
            }
        ).toBe(false);
    }

    static async runLoginIntoSecondServerRoomTest(context)
    {
        let {page, gameConfig} = context;
        let secondServerConfig = await CrossServerHouseAssignment.assignHouseToSecondServer(context);
        let houseArrival = await CrossServerHouseAssignment.storePlayerInHouse(context, gameConfig.e2ePlayerName, 0);
        await Login.loginRootPlayer(page, gameConfig, context.longRun);
        await Navigation.waitForRoom(page, TestCrossServerMoves.SECOND_HOUSE, TimeConstants.ROOM_TRANSITION);
        let arrived = await CrossServerHouseAssignment.fetchHouseArrivalState(page, secondServerConfig, gameConfig.e2ePlayerName);
        expect(
            {isGameOver: arrived.isGameOver, position: [arrived.housePlayer.x, arrived.housePlayer.y]},
            'A login from the server-1 page with the last room on server-2 plays there with no modal: '
                +arrived.housePlayer.error
        ).toEqual({isGameOver: false, position: [houseArrival.x, houseArrival.y]});
    }

    static async runSelectedSecondServerRoomTest(context)
    {
        let {page, gameConfig} = context;
        let secondServerConfig = await CrossServerHouseAssignment.assignHouseToSecondServer(context);
        await Login.loginRootPlayer(page, gameConfig, context.longRun, '', false, TestCrossServerMoves.SECOND_HOUSE);
        await Navigation.waitForRoom(page, TestCrossServerMoves.SECOND_HOUSE, TimeConstants.ROOM_TRANSITION);
        let arrived = await CrossServerHouseAssignment.fetchHouseArrivalState(page, secondServerConfig, gameConfig.e2ePlayerName);
        let defaultPoint = await TeleportNpcSteps.fetchDefaultReturnPoint(gameConfig, TestCrossServerMoves.SECOND_HOUSE);
        expect(
            {isGameOver: arrived.isGameOver, position: [arrived.housePlayer.x, arrived.housePlayer.y]},
            'The server-2 room picked in the login selector starts there on its default return point: '
                +arrived.housePlayer.error
        ).toEqual({isGameOver: false, position: [defaultPoint.x, defaultPoint.y]});
    }

    static async runRejectedSelectionTest(context)
    {
        let {page, gameConfig, longRun} = context;
        let townPlayerName = CharacterCreation.createPlayerName();
        await CharacterCreation.createPlayerInRoom(page, gameConfig, longRun, townPlayerName, Login.TOWN_ROOM_NAME);
        let secondServerConfig = E2eServerInstances.forServer(gameConfig, CrossServerHouseAssignment.SECOND_SERVER);
        await CrossServerHouseAssignment.assignRoomsServersUrls(context, {
            [TestCrossServerMoves.SECOND_HOUSE]: secondServerConfig.serverBaseUrl.replace('//localhost', '//127.0.0.1'),
            [Login.TOWN_ROOM_NAME]: E2eServerInstances.fetchAllServersUrls()[0]
        });
        await LoginServerApi.setOtherServer(gameConfig, secondServerConfig.serverBaseUrl, true);
        await CrossServerHouseAssignment.storePlayerInHouse(context, gameConfig.e2ePlayerName, 0);
        await Login.loginToSelection(page, gameConfig.e2eUsername, gameConfig.e2ePassword, longRun);
        expect(await Login.selectPlayer(page, gameConfig.e2ePlayerName), 'The house player is listed').toBe(true);
        await page.click(Selectors.characterSelect.selectorSubmit, {
            timeout: TimeConstants.forLongRun(TimeConstants.GAME_START, longRun)
        });
        await expect(page.locator(GameConst.SELECTORS.PLAYER_SELECTION_ERRORS), 'Server-2 rejects the house scene join')
            .not.toBeEmpty({timeout: TimeConstants.ROOM_TRANSITION});
        await CharacterCreation.startSelectedPlayer(page, townPlayerName, longRun);
        expect(
            {
                clientRoom: await Navigation.getCurrentRoomName(page),
                openSecondServerRooms: await page.evaluate(TestCrossServerMoves.READ_OPEN_OTHER_SERVER_ROOMS)
            },
            'The second player enters the town on server-1 with no server-2 room left open'
        ).toEqual({clientRoom: Login.TOWN_ROOM_NAME, openSecondServerRooms: 0});
        await expect.poll(
            async () => (await LoginServerApi.fetchActiveSessions(secondServerConfig, gameConfig.e2eUsername)).rooms,
            {message: 'Server-2 keeps no room of the user', timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual([]);
    }

    static async runLeftServerLogoutTest(context)
    {
        let gameConfig = context.gameConfig;
        let secondServerConfig = await TestCrossServerMoves.moveFromTown(context, TestCrossServerMoves.SECOND_HOUSE);
        expect(
            await LoginServerApi.fetchActiveSessionsCount(secondServerConfig, gameConfig.e2eUsername),
            'The user has a session on server-2'
        ).toBeGreaterThan(0);
        await expect.poll(
            async () => (await LoginServerApi.fetchActiveSessions(gameConfig, gameConfig.e2eUsername)).rooms,
            {
                message: 'Server-1 logs the user out of every room once it moved to server-2',
                timeout: TimeConstants.SERVER_RESPONSE
            }
        ).toEqual([]);
    }

    static run()
    {
        test.describe('Cross Server Moves', () => {
            test('a player moving to server-2 leaves the server-1 observer and is shown with its name to the server-2 observer', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                test.setTimeout(TimeConstants.GAME_START * 3 + 2 * TimeConstants.ROOM_TRANSITION);
                await TestCrossServerMoves.runObserversTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('a server-1 room left empty by a move to another server-1 room is disposed after the dispose timeout', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerMoves.runLeftRoomDisposeTest(
                    {page, gameConfig, e2eGroup, longRun},
                    TestCrossServerMoves.FIRST_HOUSE
                );
            });
            test('a server-1 room left empty by a move to server-2 is disposed after the dispose timeout', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerMoves.runLeftRoomDisposeTest(
                    {page, gameConfig, e2eGroup, longRun},
                    TestCrossServerMoves.SECOND_HOUSE
                );
            });
            test('a server-2 room picked in the login room selector starts there on its default return point', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerMoves.runSelectedSecondServerRoomTest({page, gameConfig, e2eGroup, longRun});
            });
            test('a login from the server-1 page with the last room on server-2 starts there with no modal', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerMoves.runLoginIntoSecondServerRoomTest({page, gameConfig, e2eGroup, longRun});
            });
            test('a player selected after a rejected server-2 scene join enters server-1 with no server-2 room left', async ({ page, gameConfig, e2eGroup, longRun }) => {
                test.setTimeout(TimeConstants.GAME_START * 2 + TimeConstants.CHARACTER_SCREEN * 2);
                await TestCrossServerMoves.runRejectedSelectionTest({page, gameConfig, e2eGroup, longRun});
            });
            test('the server a player leaves for another server logs the user out of every room', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerMoves.runLeftServerLogoutTest({page, gameConfig, e2eGroup, longRun});
            });
            test('moves between server-1 and server-2 and back twice arrive on every return point with no modal', async ({ page, gameConfig, e2eGroup, longRun }) => {
                test.setTimeout(TimeConstants.GAME_START + 6 * TimeConstants.ROOM_TRANSITION);
                await TestCrossServerMoves.runRoundTripsTest({page, gameConfig, e2eGroup, longRun});
            });
            test('a player crossing into a room of server-2 arrives there with no session ended modal', async ({ page, gameConfig, e2eGroup, longRun }) => {
                test.setTimeout(TimeConstants.GAME_START + 2 * TimeConstants.ROOM_TRANSITION);
                await TestCrossServerMoves.runCrossToSecondServerTest({page, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestCrossServerMoves.run();
