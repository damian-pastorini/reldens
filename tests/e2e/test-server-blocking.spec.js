/**
 *
 * Reldens - Test Server Blocking
 *
 * Tests the overloaded server: the registration and the guest forms rejected with the busy message and nothing stored,
 * a new game login rejected with the busy message while the player already in the game keeps walking, a scene change
 * to a room next to the town that is not created rejected with the busy chat error while the player stays and walks,
 * the login accepted when the blocking is disabled and the server is only monitored, the player moving to a room
 * already created on this server accepted, and the scene room not created yet rejected with the translated busy
 * message on the players selection. No test creates the room used for the rejected creation.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { CharacterCreation } = require('./helpers/character-creation');
const { DirectFormSubmit } = require('./helpers/direct-form-submit');
const { Login } = require('./helpers/login');
const { LoginServerApi } = require('./helpers/login-server-api');
const { MovementScenario } = require('./helpers/movement-scenario');
const { Navigation } = require('./helpers/navigation');
const { WalkableTileLocator } = require('./helpers/walkable-tile-locator');
const { ChangePointsSteps } = require('./helpers/change-points-steps');
const { RoomMovementApi } = require('./helpers/room-movement-api');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { ChatConst } = require('../../lib/chat/constants');
const { sc } = require('@reldens/utils');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { GameConst } = require('../../lib/game/constants');
const GameTranslations = require('../../lib/game/client/snippets/en_US');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestServerBlocking
{

    static NOT_CREATED_ROOM_NAME = 'reldens-forest-level-6';
    static MEMORY_LIMIT_KEY = 'maxMemoryPercent';

    static async expectBusyError(page, errorSelector, longRun)
    {
        await expect(page.locator(errorSelector)).toHaveText(GameConst.SERVER_BUSY_MESSAGE, {
            timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun)
        });
        await expect(page.locator(DirectFormSubmit.VISIBLE_SELECTION), 'The selection must stay hidden').toHaveCount(0);
    }

    static async runRegistrationBlockedTest(page, screenshots, gameConfig, longRun)
    {
        let username = DirectFormSubmit.createUniqueName();
        let usernameFilter = {username};
        let registration = DirectFormSubmit.createRegistration(
            username,
            username+'@yourgame.com',
            DirectFormSubmit.VALID_PASSWORD
        );
        await LoginServerApi.setServerOverloaded(gameConfig, true);
        await DirectFormSubmit.submit(page, registration, true);
        await TestServerBlocking.expectBusyError(page, Selectors.registerResponse.error, longRun);
        expect(await E2eSeedAndRestoreApi.loadRows(gameConfig, 'users', usernameFilter), 'No account created').toEqual(
            []
        );
        await screenshots.capture(page, 'server-blocking-registration');
        await LoginServerApi.setServerOverloaded(gameConfig, false);
        await DirectFormSubmit.submit(page, registration, true);
        await DirectFormSubmit.expectPlayerSelection(page, longRun, 'The registration must pass after the blocking');
        expect((await E2eSeedAndRestoreApi.loadRows(gameConfig, 'users', usernameFilter)).length).toBe(1);
    }

    static async runGuestBlockedTest(page, screenshots, gameConfig, longRun)
    {
        let guestFilter = {
            role_id: Number(await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, 'server/players/guestUser/roleId'))
        };
        let guestsCount = (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'users', guestFilter)).length;
        await LoginServerApi.setServerOverloaded(gameConfig, true);
        await DirectFormSubmit.openPage(page);
        await page.click(Selectors.login.guestSubmit);
        await TestServerBlocking.expectBusyError(page, Selectors.guest.error, longRun);
        expect((await E2eSeedAndRestoreApi.loadRows(gameConfig, 'users', guestFilter)).length, 'No guest created').toBe(
            guestsCount
        );
        await screenshots.capture(page, 'server-blocking-guest');
    }

    static async runNewLoginBlockedTest(page, secondPage, screenshots, gameConfig, longRun)
    {
        let playingContext = await MovementScenario.start(secondPage, gameConfig, longRun);
        await LoginServerApi.setServerOverloaded(gameConfig, true);
        expect(
            await Login.submitLoginExpectingError(page, gameConfig.e2eUsername, gameConfig.e2ePassword, longRun),
            'The new game login is rejected with the busy message'
        ).toBe(GameConst.SERVER_BUSY_MESSAGE);
        await TestServerBlocking.expectKeepsWalking(secondPage, playingContext);
        await screenshots.capture(page, 'server-blocking-new-login');
    }

    static async expectKeepsWalking(page, playingContext)
    {
        let playingPlayer = await playingContext.fetchPlayer();
        let origin = [playingPlayer.currentCol, playingPlayer.currentRow];
        let tiles = await playingContext.fetchTiles(origin, 3);
        let targetTile = WalkableTileLocator.DIRECTIONS.map(
            direction => WalkableTileLocator.findWalkableAlong(tiles, origin, direction.step, [2, 1])
        ).find(tile => tile);
        expect(targetTile, 'A walkable tile next to the player in the game').toBeTruthy();
        let walk = await MovementScenario.movePlayer(page, playingContext, targetTile, playingContext.navTimeout);
        expect(
            walk.done,
            'The player in the game keeps walking: '+sc.toJsonString({origin, targetTile, lastStep: [...walk.trail].pop()})
        ).toBe(true);
    }

    static async findNotCreatedTownRoom(gameConfig, topology)
    {
        for(let roomName of Object.keys(topology.roomsIds)){
            let isTownNeighbor = 0 < ChangePointsSteps.fetchTiles(topology, Login.TOWN_ROOM_NAME, roomName).length;
            if(isTownNeighbor && !await LoginServerApi.isRoomCreated(gameConfig, roomName)){
                return roomName;
            }
        }
        return false;
    }

    static async runSceneChangeBlockedTest(page, screenshots, gameConfig, longRun)
    {
        let playingContext = await MovementScenario.start(page, gameConfig, longRun);
        let topology = await ChangePointsSteps.loadTopology(gameConfig);
        let nextRoomName = await TestServerBlocking.findNotCreatedTownRoom(gameConfig, topology);
        expect(nextRoomName, 'A room next to the town that is not created').toBeTruthy();
        let arrival = ChangePointsSteps.fetchArrival(topology, Login.TOWN_ROOM_NAME, nextRoomName);
        let placement = await RoomMovementApi.placePlayer(gameConfig, Login.TOWN_ROOM_NAME, playingContext.playerName, {
            x: arrival.x,
            y: arrival.y
        });
        expect(placement.position, 'The player stands below the '+nextRoomName+' change point: '+placement.error).toBeTruthy();
        await RoomMessagesRecorder.start(page);
        await LoginServerApi.setServerOverloaded(gameConfig, true);
        await page.keyboard.down('ArrowUp');
        await RoomMessagesRecorder.waitForMessage(page, ChatConst.CHAT_ACTION, TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun));
        await page.keyboard.up('ArrowUp');
        expect(
            (await RoomMessagesRecorder.fetchMessages(page, ChatConst.CHAT_ACTION)).map(
                message => [message[ChatConst.TYPES.KEY], message[ChatConst.MESSAGE.KEY]]
            ),
            'The player gets the busy room error'
        ).toContainEqual([ChatConst.TYPES.ERROR, GameConst.ROOM_UNAVAILABLE.SERVER_BUSY]);
        expect(
            [await Navigation.getCurrentRoomName(page), await LoginServerApi.isRoomCreated(gameConfig, nextRoomName)],
            'The player stays in the town and the next room is not created'
        ).toEqual([Login.TOWN_ROOM_NAME, false]);
        await TestServerBlocking.expectKeepsWalking(page, playingContext);
        await screenshots.capture(page, 'server-blocking-scene-change');
    }

    static async runMonitorOnlyTest(page, screenshots, gameConfig, longRun)
    {
        await LoginServerApi.setServerOverloaded(gameConfig, true, {blockingEnabled: false});
        let usageReport = await LoginServerApi.fetchUsageReport(gameConfig);
        expect(
            [usageReport.blockingEnabled, usageReport.isOverloaded, usageReport.isBlocking],
            'Overloaded and only monitored'
        ).toEqual([false, true, false]);
        expect(usageReport.exceededLimits).toContain(TestServerBlocking.MEMORY_LIMIT_KEY);
        await Login.loginToSelection(page, gameConfig.e2eUsername, gameConfig.e2ePassword, longRun);
        await expect(
            page.locator(Selectors.characterSelect.sceneSelect+' option').filter({
                hasText: GameTranslations.game.roomUnavailableLabel
            }),
            'No room is labeled unavailable'
        ).toHaveCount(0);
        await CharacterCreation.startSelectedPlayer(page, gameConfig.e2ePlayerName, longRun);
        await screenshots.capture(page, 'server-overloaded-monitor-only');
    }

    static async runMoveToCreatedRoomTest(page, secondPage, screenshots, gameConfig, longRun)
    {
        await Login.loginAndStartGame(
            secondPage,
            gameConfig.e2eUsername2,
            gameConfig.e2ePassword2 || gameConfig.e2ePassword,
            gameConfig.e2ePlayerName2,
            longRun,
            false,
            Login.FOREST_ROOM_NAME
        );
        await Login.loginRootPlayer(page, gameConfig, longRun);
        expect(await LoginServerApi.isRoomCreated(gameConfig, Login.FOREST_ROOM_NAME), 'The forest is created').toBe(
            true
        );
        await LoginServerApi.setServerOverloaded(gameConfig, true);
        expect((await LoginServerApi.fetchUsageReport(gameConfig)).isBlocking, 'The server is blocking').toBe(true);
        let playerName = gameConfig.e2ePlayerName;
        let walkContext = MovementScenario.createWalkContext(gameConfig, Login.TOWN_ROOM_NAME, playerName, longRun);
        await MovementScenario.placePlayerOnReturnPoint(page, walkContext);
        await MovementScenario.walkIntoTheForest(page, walkContext, longRun);
        expect(await Navigation.getCurrentRoomName(page)).toBe(Login.FOREST_ROOM_NAME);
        expect([
            await LoginServerApi.fetchPlayersInRoom(gameConfig, Login.FOREST_ROOM_NAME, playerName),
            await LoginServerApi.fetchPlayersInRoom(gameConfig, Login.FOREST_ROOM_NAME, gameConfig.e2ePlayerName2)
        ], 'Both players in the forest').toEqual([1, 1]);
        await screenshots.capture(page, 'server-blocking-move-accepted');
    }

    static async runRoomNotCreatedTest(page, screenshots, gameConfig, longRun)
    {
        let roomName = TestServerBlocking.NOT_CREATED_ROOM_NAME;
        let playerName = gameConfig.e2ePlayerName;
        expect(await LoginServerApi.isRoomCreated(gameConfig, roomName), 'No test creates the room').toBe(false);
        let storedRoomId = (await CharacterCreation.fetchPlayerState(gameConfig, playerName)).room_id;
        await Login.loginToSelection(page, gameConfig.e2eUsername, gameConfig.e2ePassword, longRun);
        expect(await Login.selectPlayer(page, playerName), playerName).toBe(true);
        expect(await Login.selectScene(page, roomName), roomName).toBe(true);
        await LoginServerApi.setServerOverloaded(gameConfig, true);
        await page.click(Selectors.characterSelect.selectorSubmit);
        await expect(page.locator(GameConst.SELECTORS.PLAYER_SELECTION_ERRORS)).toHaveText(
            GameTranslations.game.errors.roomServerBusy,
            {timeout: TimeConstants.forLongRun(TimeConstants.GAME_START, longRun)}
        );
        await expect(page.locator(Selectors.body.gameEngineStarted), 'The game must not start').toHaveCount(0);
        expect(await LoginServerApi.isRoomCreated(gameConfig, roomName), 'The creation must be rejected').toBe(false);
        expect((await CharacterCreation.fetchPlayerState(gameConfig, playerName)).room_id, 'Room kept').toBe(
            storedRoomId
        );
        await screenshots.capture(page, 'server-blocking-room-not-created');
    }

    static run()
    {
        test.describe('Server Blocking', () => {
            test('registration is rejected with the busy message and no account is created', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestServerBlocking.runRegistrationBlockedTest(page, screenshots, gameConfig, longRun);
            });
            test('guest is rejected with the busy message and no guest is created', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestServerBlocking.runGuestBlockedTest(page, screenshots, gameConfig, longRun);
            });
            test('a new game login is rejected with the busy message and the player already in the game keeps playing', async ({ page, secondPage, screenshots, gameConfig, longRun }) => {
                await TestServerBlocking.runNewLoginBlockedTest(page, secondPage, screenshots, gameConfig, longRun);
            });
            test('a scene change to a room not created is rejected with the busy message and the player keeps playing', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestServerBlocking.runSceneChangeBlockedTest(page, screenshots, gameConfig, longRun);
            });
            test('overloaded server with the blocking disabled accepts the login', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestServerBlocking.runMonitorOnlyTest(page, screenshots, gameConfig, longRun);
            });
            test('player moving to a created room of this server is accepted', async ({ page, secondPage, screenshots, gameConfig, longRun }) => {
                await TestServerBlocking.runMoveToCreatedRoomTest(page, secondPage, screenshots, gameConfig, longRun);
            });
            test('scene room not created yet is rejected with the translated busy message', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestServerBlocking.runRoomNotCreatedTest(page, screenshots, gameConfig, longRun);
            });
        });
    }

}

TestServerBlocking.run();
