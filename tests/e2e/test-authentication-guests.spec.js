/**
 *
 * Reldens - Test Authentication Guests
 *
 * Tests the guests in the game and their cleanup: the scene join rejected for a room not allowed to guests, the change
 * point to the sample room without allowGuest (the first house floor) accepted with the sample
 * server/players/guestUser/allowOnRooms on and rejected with the chat error line once the guest rooms are computed with
 * it off, the scene
 * change with the server generated password, the random spawn, a guest used from two tabs, and the stale guests removed
 * or kept by the cleanup. The stale rows are seeded with a date older than the cleanup limit used by the test, so only
 * those rows can be selected.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { DirectFormSubmit } = require('./helpers/direct-form-submit');
const { CharacterCreation } = require('./helpers/character-creation');
const { Login } = require('./helpers/login');
const { LoginServerApi } = require('./helpers/login-server-api');
const { Navigation } = require('./helpers/navigation');
const { MovementScenario } = require('./helpers/movement-scenario');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { SecurityApi } = require('./helpers/security-api');
const { ChatSteps } = require('./helpers/chat-steps');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { ChangePointsSteps } = require('./helpers/change-points-steps');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { GameConst } = require('../../lib/game/constants');
const { ChatConst } = require('../../lib/chat/constants');
const ChatTranslations = require('../../lib/chat/client/snippets/en_US');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAuthenticationGuests
{

    static STALE_DATE = '2001-01-01 00:00:00';
    static RECENT_DATE = '2030-01-01 00:00:00';
    static OLDER_THAN_TIME = Date.UTC(2002, 0, 1);
    static RANDOM_SPAWN_ROOM_NAME = 'reldens-bots-forest';
    static HOUSE_ROOM_NAME = 'reldens-house-1';
    static NOT_GUEST_ROOM_NAME = 'reldens-house-1-2d-floor';
    static ALLOW_ON_ROOMS_PATH = 'server/players/guestUser/allowOnRooms';
    static async walkToForest(page, gameConfig, playerName, longRun)
    {
        let walkContext = MovementScenario.createWalkContext(gameConfig, Login.TOWN_ROOM_NAME, playerName, longRun);
        await MovementScenario.placePlayerOnReturnPoint(page, walkContext);
        await MovementScenario.walkIntoTheForest(page, walkContext, longRun);
        return await Navigation.getCurrentRoomName(page);
    }

    static async runRoomNotAllowedTest(page, secondPage, screenshots, gameConfig, longRun)
    {
        let guest = await CharacterCreation.enterGuestInGame(page, longRun, Login.TOWN_ROOM_NAME);
        await Login.loginToSelection(secondPage, guest.username, guest.password, longRun);
        await SecurityApi.request(gameConfig, 'POST', '/api/e2e/login-server/guest-rooms-empty', {});
        await secondPage.click(Selectors.characterSelect.selectorSubmit);
        await expect(secondPage.locator(GameConst.SELECTORS.PLAYER_SELECTION_ERRORS)).not.toBeEmpty({
            timeout: TimeConstants.forLongRun(TimeConstants.GAME_START, longRun)
        });
        await expect(secondPage.locator(Selectors.body.gameEngineStarted), 'The join must be rejected').toHaveCount(0);
        await screenshots.capture(secondPage, 'guest-room-not-allowed');
    }

    static async runChangePointNotAllowedTest(page, gameConfig, longRun)
    {
        let guest = await CharacterCreation.enterGuestInGame(page, longRun, Login.TOWN_ROOM_NAME);
        await expect(page.locator(Selectors.chat.tabContentGeneral), 'The chat shows the own joined line').toContainText(
            guest.playerName,
            {timeout: TimeConstants.SERVER_RESPONSE}
        );
        await ChatSteps.recordChat(page);
        await SecurityApi.request(gameConfig, 'POST', '/api/e2e/login-server/guest-rooms-empty', {});
        let placed = await RoomObjectsApi.placePlayerOnChangePoint(page, gameConfig, Login.TOWN_ROOM_NAME, Login.FOREST_ROOM_NAME);
        expect(placed.position, 'The guest is placed on the change point to the forest: '+placed.error).toBeTruthy();
        await TestAuthenticationGuests.expectChangePointErrorLine(page);
        await ChatSteps.openChat(page);
        await expect(page.locator(Selectors.chat.tabContentGeneral), 'The translated error line is shown')
            .toContainText(ChatTranslations.chat.guestInvalidChangePoint);
        expect(await Navigation.getCurrentRoomName(page), 'The guest stays in the town').toBe(Login.TOWN_ROOM_NAME);
        expect(
            (await GameplayE2eStateApi.fetchPlayer(gameConfig, Login.TOWN_ROOM_NAME, guest.playerName)).scene,
            'The server keeps the guest in the town'
        ).toBe(Login.TOWN_ROOM_NAME);
    }

    static async expectChangePointErrorLine(page)
    {
        await expect.poll(
            async () => (await ChatSteps.fetchChat(page)).filter(
                message => ChatConst.SNIPPETS.GUEST_INVALID_CHANGE_POINT === message[ChatConst.MESSAGE.KEY]
                    && ChatConst.TYPES.ERROR === message[ChatConst.TYPES.KEY]
            ).length,
            {message: 'The guest gets the error line', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(1);
    }

    static async runAllowOnRoomsTest(page, gameConfig, longRun)
    {
        let guest = await CharacterCreation.enterGuestInGame(page, longRun, Login.TOWN_ROOM_NAME);
        await MovementScenario.waitForReadyScene(page);
        let houseRoom = TestAuthenticationGuests.HOUSE_ROOM_NAME;
        let floorRoom = TestAuthenticationGuests.NOT_GUEST_ROOM_NAME;
        let context = {gameConfig};
        let player = {page, playerName: guest.playerName};
        let topology = await ChangePointsSteps.loadTopology(gameConfig);
        await ChangePointsSteps.changeRoom(
            context,
            player,
            topology,
            ChangePointsSteps.buildWalk(topology, [Login.TOWN_ROOM_NAME, houseRoom]).pop()
        );
        expect(
            Number(await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, TestAuthenticationGuests.ALLOW_ON_ROOMS_PATH)),
            'The sample config allows the guests on every room'
        ).toBe(1);
        let floorChange = ChangePointsSteps.buildWalk(topology, [houseRoom, floorRoom]).pop();
        await ChangePointsSteps.changeRoom(context, player, topology, floorChange);
        expect(
            (await GameplayE2eStateApi.fetchPlayer(gameConfig, floorRoom, guest.playerName)).scene,
            'The server places the guest in the room without allowGuest'
        ).toBe(floorRoom);
        await ChangePointsSteps.changeRoom(
            context,
            player,
            topology,
            ChangePointsSteps.buildWalk(topology, [floorRoom, houseRoom]).pop()
        );
        await MovementScenario.waitForReadyScene(page);
        let guestRooms = (await SecurityApi.request(
            gameConfig,
            'POST',
            '/api/e2e/login-server/guest-rooms-allow-on-rooms',
            {allowOnRooms: false}
        )).guestRooms;
        expect(
            [guestRooms.includes(houseRoom), guestRooms.includes(floorRoom)],
            'The guest rooms with allowOnRooms off keep only the rooms with allowGuest'
        ).toEqual([true, false]);
        await ChatSteps.recordChat(page);
        let placed = await RoomObjectsApi.placePlayerOnChangePoint(
            page,
            gameConfig,
            houseRoom,
            floorRoom,
            await ChangePointsSteps.resolveTile(context, floorChange)
        );
        expect(placed.position, 'The guest is placed on the change point to the floor: '+placed.error).toBeTruthy();
        await TestAuthenticationGuests.expectChangePointErrorLine(page);
        expect(await Navigation.getCurrentRoomName(page), 'The guest stays in the house').toBe(houseRoom);
    }

    static async runSceneChangeTest(page, screenshots, gameConfig, longRun)
    {
        let guest = await CharacterCreation.enterGuestInGame(page, longRun, Login.TOWN_ROOM_NAME);
        expect(guest.password, 'The server must send the generated password').toBeTruthy();
        expect(await page.evaluate(() => window.reldens.userData.password)).toBe(guest.password);
        expect(await page.evaluate(() => window.reldens.userData.username)).toBe(guest.username);
        expect(
            await TestAuthenticationGuests.walkToForest(page, gameConfig, guest.playerName, longRun),
            'The guest must change the scene'
        ).toBe(Login.FOREST_ROOM_NAME);
        await screenshots.capture(page, 'guest-scene-change');
    }

    static async runRandomSpawnTest(page, screenshots, gameConfig, longRun)
    {
        let roomName = TestAuthenticationGuests.RANDOM_SPAWN_ROOM_NAME;
        let guest = await CharacterCreation.enterGuestInGame(page, longRun, roomName);
        expect(await Navigation.getCurrentRoomName(page)).toBe(roomName);
        let roomId = await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'rooms', {name: roomName});
        let defaultPoint = (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'roomsReturnPoints', {
            room_id: roomId,
            is_default: 1
        })).shift();
        let spawnedPlayer = await GameplayE2eStateApi.fetchPlayer(gameConfig, roomName, guest.playerName);
        expect([spawnedPlayer.x, spawnedPlayer.y], 'The guest must not spawn on the default point').not.toEqual(
            [defaultPoint.x, defaultPoint.y]
        );
        await screenshots.capture(page, 'guest-random-spawn');
    }

    static async seedStaleGuest(gameConfig, e2eGroup)
    {
        let uniqueKey = DirectFormSubmit.createUniqueName();
        let stale = {
            user: await E2eSeedAndRestoreApi.createRow(gameConfig, e2eGroup, 'users', {
                email: uniqueKey+'@e2e-guest.test',
                username: uniqueKey,
                password: 'e2e-stale-guest',
                role_id: Number(await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, 'server/players/guestUser/roleId')),
                status: '1',
                updated_at: TestAuthenticationGuests.STALE_DATE
            })
        };
        stale.player = await E2eSeedAndRestoreApi.createRow(gameConfig, e2eGroup, 'players', {
            user_id: stale.user.id,
            name: uniqueKey
        });
        return stale;
    }

    static async runStaleRemovedTest(gameConfig, e2eGroup)
    {
        let stale = await TestAuthenticationGuests.seedStaleGuest(gameConfig, e2eGroup);
        let userFilter = {user_id: stale.user.id};
        let localeId = await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'locale', {});
        await E2eSeedAndRestoreApi.createRow(gameConfig, e2eGroup, 'usersLogin', userFilter);
        await E2eSeedAndRestoreApi.createRow(gameConfig, e2eGroup, 'usersLocale', {...userFilter, locale_id: localeId});
        let scoreFilter = {player_id: stale.player.id};
        await E2eSeedAndRestoreApi.createRow(gameConfig, e2eGroup, 'scores', {
            ...scoreFilter,
            total_score: 1,
            players_kills_count: 0,
            npcs_kills_count: 0
        });
        await E2eSeedAndRestoreApi.createRow(gameConfig, e2eGroup, 'questsProgress', {
            ...scoreFilter,
            quest_key: 'e2e-stale-guest-quest'
        });
        expect(await LoginServerApi.runGuestsCleanup(gameConfig, TestAuthenticationGuests.OLDER_THAN_TIME)).toBe(1);
        expect(await E2eSeedAndRestoreApi.loadRows(gameConfig, 'users', {id: stale.user.id})).toEqual([]);
        expect(await E2eSeedAndRestoreApi.loadRows(gameConfig, 'players', {id: stale.player.id})).toEqual([]);
        expect(await E2eSeedAndRestoreApi.loadRows(gameConfig, 'scores', scoreFilter), 'The guest score row').toEqual([]);
        expect(await E2eSeedAndRestoreApi.loadRows(gameConfig, 'questsProgress', scoreFilter), 'The guest quests').toEqual([]);
        expect(await E2eSeedAndRestoreApi.loadRows(gameConfig, 'usersLogin', userFilter)).toEqual([]);
        expect(await E2eSeedAndRestoreApi.loadRows(gameConfig, 'usersLocale', userFilter)).toEqual([]);
    }

    static async runActiveKeptTest(page, gameConfig, e2eGroup, longRun)
    {
        await DirectFormSubmit.openPage(page);
        await page.click(Selectors.login.guestSubmit);
        await DirectFormSubmit.expectPlayerSelection(page, longRun, 'The guest must reach the selection');
        let username = await page.evaluate(() => window.reldens.initialGameData.userName);
        let usernameFilter = {username};
        await E2eSeedAndRestoreApi.updateWithPreserve(gameConfig, e2eGroup, 'users', usernameFilter, {
            updated_at: TestAuthenticationGuests.STALE_DATE
        });
        expect(await LoginServerApi.runGuestsCleanup(gameConfig, TestAuthenticationGuests.OLDER_THAN_TIME)).toBe(0);
        let keptGuest = (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'users', usernameFilter)).shift();
        expect(
            new Date(keptGuest.updated_at).getTime(),
            'The active guest must be touched'
        ).toBeGreaterThan(TestAuthenticationGuests.OLDER_THAN_TIME);
    }

    static async runClanOwnerKeptTest(gameConfig, e2eGroup)
    {
        let stale = await TestAuthenticationGuests.seedStaleGuest(gameConfig, e2eGroup);
        await E2eSeedAndRestoreApi.createRow(gameConfig, e2eGroup, 'clan', {
            owner_id: stale.player.id,
            name: 'c'+stale.player.id,
            points: 0,
            level: (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'clanLevels', {})).shift().key
        });
        expect(await LoginServerApi.runGuestsCleanup(gameConfig, TestAuthenticationGuests.OLDER_THAN_TIME)).toBe(0);
        expect((await E2eSeedAndRestoreApi.loadRows(gameConfig, 'users', {id: stale.user.id})).length).toBe(1);
    }

    static async runUsedAgainKeptTest(gameConfig, e2eGroup)
    {
        let stale = await TestAuthenticationGuests.seedStaleGuest(gameConfig, e2eGroup);
        let userFilter = {id: stale.user.id};
        let staleGuest = (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'users', userFilter)).shift();
        await E2eSeedAndRestoreApi.updateCreatedRow(gameConfig, e2eGroup, 'users', stale.user.id, {
            updated_at: TestAuthenticationGuests.RECENT_DATE
        });
        let claimResult = await SecurityApi.request(gameConfig, 'POST', '/api/e2e/login-server/guest-claim', {
            staleGuest: {...staleGuest, related_players: [stale.player]},
            olderThanTime: TestAuthenticationGuests.OLDER_THAN_TIME
        });
        expect(claimResult.deleted, 'The guest used again must be kept').toBe(false);
        let keptGuest = (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'users', userFilter)).shift();
        expect(keptGuest.status).toBe(staleGuest.status);
    }

    static run()
    {
        test.describe('Authentication Guests', () => {
            test('guest join of a room not allowed to guests is rejected', async ({ page, secondPage, screenshots, gameConfig, longRun }) => {
                await TestAuthenticationGuests.runRoomNotAllowedTest(page, secondPage, screenshots, gameConfig, longRun);
            });
            test('guest on a change point to a room not allowed to guests gets the error line', async ({ page, gameConfig, longRun }) => {
                await TestAuthenticationGuests.runChangePointNotAllowedTest(page, gameConfig, longRun);
            });
            test('guest change point to a room without allowGuest is accepted with allowOnRooms on and rejected with it off', async ({ page, gameConfig, longRun }) => {
                await TestAuthenticationGuests.runAllowOnRoomsTest(page, gameConfig, longRun);
            });
            test('guest changes the scene with the generated password', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAuthenticationGuests.runSceneChangeTest(page, screenshots, gameConfig, longRun);
            });
            test('guest spawns in a random place', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAuthenticationGuests.runRandomSpawnTest(page, screenshots, gameConfig, longRun);
            });
            test('stale guest is removed with its rows', async ({ gameConfig, e2eGroup }) => {
                await TestAuthenticationGuests.runStaleRemovedTest(gameConfig, e2eGroup);
            });
            test('stale guest with an active session is kept and touched', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestAuthenticationGuests.runActiveKeptTest(page, gameConfig, e2eGroup, longRun);
            });
            test('stale guest owning a clan is kept', async ({ gameConfig, e2eGroup }) => {
                await TestAuthenticationGuests.runClanOwnerKeptTest(gameConfig, e2eGroup);
            });
            test('guest used again before the claim is kept', async ({ gameConfig, e2eGroup }) => {
                await TestAuthenticationGuests.runUsedAgainKeptTest(gameConfig, e2eGroup);
            });
        });
    }

}

TestAuthenticationGuests.run();
