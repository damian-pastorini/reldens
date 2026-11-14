/**
 *
 * Reldens - Test Minimap
 *
 * Tests the minimap box of the game page (exclusive group, the sample minimap is a round map with its circle): the open
 * button shows the minimap camera and its circle and the close button hides them again; the player marker follows the
 * player walk on the map image; a closed minimap stays hidden in the next room (one left open is closed by the room
 * change, ISSUE #336).
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { TeamSteps } = require('./helpers/team-steps');
const { MovementScenario } = require('./helpers/movement-scenario');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestMinimap
{

    static WALK_DISTANCES = [4, 3, 2];
    static OPEN_STATE = {boxHidden: false, openHidden: true, cameraVisible: true, circleVisible: true};
    static CLOSED_STATE = {boxHidden: true, openHidden: false, cameraVisible: false, circleVisible: false};
    static READ_MINIMAP = (selectors) => [window.reldens.getActiveScene().minimap].map((minimap) => ({
        boxHidden: document.querySelector(selectors.box).classList.contains('hidden'),
        openHidden: document.querySelector(selectors.open).classList.contains('hidden'),
        cameraVisible: Boolean(minimap?.minimapCamera?.visible),
        circleVisible: Boolean(minimap?.circle?.visible)
    })).pop();
    static READ_MARKER_OFFSET = () => [window.reldens.getActiveScene().minimap].map((minimap) => [
        minimap.playerMarker.x - minimap.mapOrigin.x - window.reldens.getCurrentPlayerAnimation().x * minimap.mapScale,
        minimap.playerMarker.y - minimap.mapOrigin.y - window.reldens.getCurrentPlayerAnimation().y * minimap.mapScale
    ].map((offset) => Math.round(offset * 10000) / 10000 + 0)).pop();
    static READ_MARKER = () => [window.reldens.getActiveScene().minimap.playerMarker.x, window.reldens.getActiveScene()
        .minimap.playerMarker.y];

    static async expectMarkerOnPlayer(page, message)
    {
        await expect.poll(async () => await page.evaluate(TestMinimap.READ_MARKER_OFFSET), {
            message,
            timeout: TimeConstants.UI_OPEN
        }).toEqual([0, 0]);
    }

    static async waitForMinimap(page)
    {
        await page.waitForFunction(
            () => Boolean(window.reldens.getActiveScene().minimap?.minimapCamera),
            null,
            {timeout: TimeConstants.SCENE_LOAD}
        );
    }

    static async expectMinimapState(page, expectedState, message)
    {
        await expect.poll(
            async () => await page.evaluate(TestMinimap.READ_MINIMAP, {
                box: Selectors.hud.minimapUi,
                open: Selectors.hud.minimapOpen
            }),
            {message, timeout: TimeConstants.UI_OPEN}
        ).toEqual(expectedState);
    }

    static async enter(context)
    {
        let player = (await TeamSteps.enterPlayers(context, 1)).shift();
        await TestMinimap.waitForMinimap(player.page);
        await player.page.locator(Selectors.hud.minimapOpen).waitFor({state: 'visible', timeout: TimeConstants.UI_OPEN});
        return player;
    }

    static async runOpenAndCloseTest(context)
    {
        let player = await TestMinimap.enter(context);
        await TestMinimap.expectMinimapState(player.page, TestMinimap.CLOSED_STATE, 'The minimap starts closed');
        await player.page.click(Selectors.hud.minimapOpen);
        await TestMinimap.expectMinimapState(player.page, TestMinimap.OPEN_STATE, 'The open button shows the minimap');
        await player.page.click(Selectors.hud.minimapClose);
        await TestMinimap.expectMinimapState(player.page, TestMinimap.CLOSED_STATE, 'The close button hides it');
        await player.page.click(Selectors.hud.minimapOpen);
        await TestMinimap.expectMinimapState(player.page, TestMinimap.OPEN_STATE, 'The open button shows it again');
    }

    static async runMarkerTest(context)
    {
        let player = await TestMinimap.enter(context);
        await player.page.click(Selectors.hud.minimapOpen);
        let walkContext = MovementScenario.createWalkContext(
            context.gameConfig,
            Login.TOWN_ROOM_NAME,
            player.playerName,
            context.longRun
        );
        await MovementScenario.pauseMovingObjects(context.gameConfig, Login.TOWN_ROOM_NAME);
        await MovementScenario.placePlayerOnReturnPoint(player.page, walkContext);
        await TestMinimap.expectMarkerOnPlayer(player.page, 'The marker is on the player position before the walk');
        let startMarker = await player.page.evaluate(TestMinimap.READ_MARKER);
        await MovementScenario.walkClearLine(
            player.page,
            walkContext,
            Login.TOWN_ROOM_NAME,
            player.playerName,
            TestMinimap.WALK_DISTANCES
        );
        await TestMinimap.expectMarkerOnPlayer(player.page, 'The marker follows the player to its new position');
        expect(await player.page.evaluate(TestMinimap.READ_MARKER), 'The marker moved with the walk').not.toEqual(
            startMarker
        );
    }

    static async runClosedSceneChangeTest(context)
    {
        let player = await TestMinimap.enter(context);
        await TestMinimap.expectMinimapState(player.page, TestMinimap.CLOSED_STATE, 'The minimap starts closed');
        await TeamSteps.changeScene(context, player, Login.TOWN_ROOM_NAME, Login.FOREST_ROOM_NAME);
        await TestMinimap.waitForMinimap(player.page);
        await TestMinimap.expectMinimapState(
            player.page,
            TestMinimap.CLOSED_STATE,
            'The closed minimap stays hidden in the next room'
        );
    }

    static run()
    {
        test.describe('Minimap', () => {
            test('the open button shows the minimap and its circle and the close button hides them', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestMinimap.runOpenAndCloseTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('the minimap marker follows the player walk', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestMinimap.runMarkerTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('a closed minimap stays hidden in the next room', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestMinimap.runClosedSceneChangeTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestMinimap.run();
