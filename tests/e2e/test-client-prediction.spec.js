/**
 *
 * Reldens - Test Client Prediction
 *
 * Tests the experimental client prediction feature (exclusive group, the prediction feature added to the features sent
 * to the client and client/general/engine/experimentalClientPrediction turned on, both restored by the group reset):
 * the prediction plugin creates the prediction world and the player prediction body on the first scene and again on
 * the scene entered through a change point, and the world of the left scene is cleared; with two clients, a server
 * placement of the player is followed by the other client right away while the own client keeps its predicted position
 * until the stop reconciles it with the server position.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { ChangePointsSteps } = require('./helpers/change-points-steps');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { MovementScenario } = require('./helpers/movement-scenario');
const { RoomMovementApi } = require('./helpers/room-movement-api');
const { SceneSpritesRecorder } = require('./helpers/scene-sprites-recorder');
const { WalkableTileLocator } = require('./helpers/walkable-tile-locator');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestClientPrediction
{

    static FEATURE_CODE = 'prediction';
    static FIRST_HOUSE = 'reldens-house-1';
    static OBSERVER_SUFFIX = '2';
    static WALK_DISTANCES = [3, 2];
    static QUIET_MS = 500;
    static READ_PREDICTION = () => [window.reldens.getActiveScene()].map((scene) => ({
        sceneKey: scene.sys.settings.key,
        hasPlugin: 'prediction' in window.reldens.features.featuresList,
        isEnabled: Boolean(scene.experimentalClientPrediction),
        hasWorld: Boolean(scene.worldPrediction),
        hasBody: Boolean(window.reldens.getCurrentPlayer().predictionBody)
    })).pop();

    static async enablePrediction(context)
    {
        let enabledCodes = (await E2eSeedAndRestoreApi.loadRows(context.gameConfig, 'features', {is_enabled: 1}))
            .map(featureRow => featureRow.code);
        expect(enabledCodes, 'The prediction feature is disabled in the sample data').not.toContain(
            TestClientPrediction.FEATURE_CODE
        );
        await E2eSeedAndRestoreApi.overrideConfig(
            context.gameConfig,
            context.e2eGroup,
            'availableFeaturesList',
            [...enabledCodes, TestClientPrediction.FEATURE_CODE]
        );
        await E2eSeedAndRestoreApi.overrideConfig(
            context.gameConfig,
            context.e2eGroup,
            'client/general/engine/experimentalClientPrediction',
            true
        );
    }

    static recordBrowserErrors(page)
    {
        let browserErrors = [];
        page.on('console', (consoleMessage) => {
            if('error' === consoleMessage.type()){
                browserErrors.push(consoleMessage.text());
            }
        });
        page.on('pageerror', (pageError) => browserErrors.push(pageError.message));
        return browserErrors;
    }

    static async expectPrediction(page, sceneKey, message, browserErrors)
    {
        await expect.poll(
            async () => page.evaluate(TestClientPrediction.READ_PREDICTION),
            {message: message+', browser errors: '+browserErrors.join(' | '), timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual({sceneKey, hasPlugin: true, isEnabled: true, hasWorld: true, hasBody: true});
    }

    static async fetchShownPosition(page, sessionId)
    {
        let sprite = await SceneSpritesRecorder.fetchPlayerSprite(page, sessionId);
        let offsets = await page.evaluate(() => [window.reldens.getCurrentPlayer()].map(
            playerEngine => [playerEngine.leftOff, playerEngine.topOff]
        ).pop());
        return [Math.round(sprite.x + offsets[0]), Math.round(sprite.y + offsets[1])];
    }

    static async runSceneWorldsTest(context)
    {
        let {page, gameConfig} = context;
        await TestClientPrediction.enablePrediction(context);
        let browserErrors = TestClientPrediction.recordBrowserErrors(page);
        await Login.loginRootPlayer(page, gameConfig, context.longRun);
        await TestClientPrediction.expectPrediction(
            page,
            Login.TOWN_ROOM_NAME,
            'The town scene has its prediction world',
            browserErrors
        );
        await page.evaluate(() => {
            window.e2ePredictionLeftScene = window.reldens.getActiveScene();
        });
        let topology = await ChangePointsSteps.loadTopology(gameConfig);
        await ChangePointsSteps.enterNextRoom(
            context,
            {page, playerName: gameConfig.e2ePlayerName},
            ChangePointsSteps.buildWalk(topology, [Login.TOWN_ROOM_NAME, TestClientPrediction.FIRST_HOUSE])[0]
        );
        await TestClientPrediction.expectPrediction(
            page,
            TestClientPrediction.FIRST_HOUSE,
            'The scene entered through the change point has its own prediction world',
            browserErrors
        );
        expect(
            await page.evaluate(() => window.e2ePredictionLeftScene.worldPrediction),
            'The prediction world of the left town scene is cleared'
        ).toBe(false);
    }

    static async runTwoClientsTest(context)
    {
        let {page, secondPage, gameConfig, longRun} = context;
        let playerName = gameConfig.e2ePlayerName;
        await TestClientPrediction.enablePrediction(context);
        let browserErrors = TestClientPrediction.recordBrowserErrors(page);
        await Login.loginRootPlayer(page, gameConfig, longRun);
        await MovementScenario.pauseMovingObjects(gameConfig, Login.TOWN_ROOM_NAME);
        await TestClientPrediction.expectPrediction(
            page,
            Login.TOWN_ROOM_NAME,
            'The player client predicts its movement',
            browserErrors
        );
        let sessionId = await page.evaluate(() => window.reldens.activeRoomEvents.room.sessionId);
        await Login.loginRootPlayer(secondPage, gameConfig, longRun, TestClientPrediction.OBSERVER_SUFFIX);
        await SceneSpritesRecorder.waitForShownPlayer(secondPage, sessionId, TimeConstants.SERVER_RESPONSE);
        let joined = await RoomMovementApi.fetchPlayer(gameConfig, Login.TOWN_ROOM_NAME, playerName);
        let walkTile = await RoomMovementApi.fetchClearLineTile(
            gameConfig,
            Login.TOWN_ROOM_NAME,
            playerName,
            TestClientPrediction.WALK_DISTANCES
        );
        expect(walkTile, 'A clear line of tiles must start on the player').toBeTruthy();
        let predictedPosition = await TestClientPrediction.fetchShownPosition(page, sessionId);
        let placement = await RoomMovementApi.placePlayer(
            gameConfig,
            Login.TOWN_ROOM_NAME,
            playerName,
            WalkableTileLocator.worldPoint(walkTile)
        );
        expect(placement.position, 'The player is placed on the server: '+placement.error).toBeTruthy();
        let placed = await RoomMovementApi.fetchPlayer(gameConfig, Login.TOWN_ROOM_NAME, playerName);
        let serverPosition = [placed.x, placed.y];
        expect(serverPosition, 'The server moved the player away from its join position').not.toEqual([joined.x, joined.y]);
        await expect.poll(
            async () => TestClientPrediction.fetchShownPosition(secondPage, sessionId),
            {message: 'The other client follows the server state', timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual(serverPosition);
        await page.waitForTimeout(TestClientPrediction.QUIET_MS);
        expect(
            [
                await TestClientPrediction.fetchShownPosition(page, sessionId),
                await page.evaluate(() => [window.reldens.getCurrentPlayer().positionFromServer.state].map(
                    state => [state.x, state.y]
                ).pop())
            ],
            'The own client keeps the predicted position and only stores the server one'
        ).toEqual([predictedPosition, serverPosition]);
        await page.evaluate(() => window.reldens.getActiveScene().player.stop());
        await expect.poll(
            async () => TestClientPrediction.fetchShownPosition(page, sessionId),
            {message: 'The stop reconciles the own client with the server position', timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual(serverPosition);
        expect(
            await page.evaluate(() => [window.reldens.getCurrentPlayer().predictionBody.position].map(
                position => [Math.round(position[0]), Math.round(position[1])]
            ).pop()),
            'The prediction body is moved to the server position'
        ).toEqual(serverPosition);
    }

    static run()
    {
        test.describe('Client Prediction', () => {
            test('the prediction world is created on the first scene and on the next one, the left one cleared', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestClientPrediction.runSceneWorldsTest({page, gameConfig, e2eGroup, longRun});
            });
            test('with two clients the other one follows the server state and the own one its prediction until the stop', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestClientPrediction.runTwoClientsTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestClientPrediction.run();
