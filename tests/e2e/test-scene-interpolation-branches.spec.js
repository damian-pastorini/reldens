/**
 *
 * Reldens - Test Scene Interpolation Branches
 *
 * Tests the client scene interpolation (SceneDynamic) branches the real movements never reach, calling the live scene
 * methods with crafted entries (SceneInterpolationProbe): the entries without state, sprite or animation are kept
 * without moving anything, the entries already on the sprite position end without moving it, a moving entry steps the
 * sprite with the real Phaser Linear function and the configured speed (2 decimals and the players size offsets for
 * the players, integers for the objects and bullets), a stopped entry places the sprite on the state position, the
 * disabled client interpolation and the missing player engine move nothing. It also checks the depth the scene gives
 * to every town map layer: the below player and change points depths from the config and the over player depth from
 * the layer position, and that with the client interpolation disabled (overridden for the group, restored by the next
 * players reset) every state change places the walking player sprite directly on its state position. The forest map
 * layers get the same depths, and the live registerLayers called on crafted maps registers nothing for a map without
 * layers and skips a layer that fails its creation while the next layers keep registering (an over player layer at
 * index 0 gets the depth 0, ISSUE #349). The long run
 * videos start in gameplay and explain each check on screen (SceneInterpolationShowcase and
 * SceneInterpolationBranchesShowcase), the normal run keeps its walk and the checks are the same in both runs.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { MovementScenario } = require('./helpers/movement-scenario');
const { Login } = require('./helpers/login');
const { Navigation } = require('./helpers/navigation');
const { Phaser } = require('./helpers/phaser');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { InterpolationFramesRecorder } = require('./helpers/interpolation-frames-recorder');
const { SceneInterpolationProbe } = require('./helpers/scene-interpolation-probe');
const { LongRunShowcase } = require('./helpers/long-run-showcase');
const { ClientInterpolationShowcase } = require('./helpers/client-interpolation-showcase');
const { SceneInterpolationShowcase } = require('./helpers/scene-interpolation-showcase');
const { SceneInterpolationBranchesShowcase } = require('./helpers/scene-interpolation-branches-showcase');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestSceneInterpolationBranches
{

    static PROBE_BULLET_KEY = 'e2e-interpolation-bullet';
    static CLIENT_INTERPOLATION_PATH = 'client/general/engine/clientInterpolation';
    static WALK_MS = 1500;
    static CRAFTED_MAP = {height: 10, tileHeight: 32};
    static REGISTER_CRAFTED_LAYERS = (crafted) => crafted.layersNamesList.map((layersNames) => {
        let scene = window.reldens.getActiveScene();
        let craftedScene = {
            configManager: scene.configManager,
            generatedTilesets: [],
            layers: {},
            key: 'e2e-crafted-map',
            map: {
                height: crafted.mapSize.height,
                tileHeight: crafted.mapSize.tileHeight,
                layers: layersNames.map((name) => ({name})),
                createLayer: (name) => 'e2e-failing-layer' === name ? null : {
                    layer: {name},
                    depth: 0,
                    setDepth: function(depth){
                        this.depth = depth;
                    }
                }
            }
        };
        return {
            registered: scene.registerLayers.call(craftedScene),
            layers: Object.keys(craftedScene.layers).map((layerIndex) => ({
                name: craftedScene.layers[layerIndex].layer.name,
                depth: craftedScene.layers[layerIndex].depth
            }))
        };
    });

    static expectPlayersBranches(results)
    {
        let precision = InterpolationFramesRecorder.PLAYER_PRECISION;
        expect(results.withoutEntries, 'Without entries the players interpolation must do nothing').toBe(false);
        expect(results.missing.returned).toBe(true);
        expect(results.missing.keys, 'The entries without state or sprite must be kept')
            .toEqual(['e2e-missing-state', 'e2e-missing-sprite']);
        expect(results.missing.sprite, 'The entries without state or sprite must not move the player')
            .toEqual(results.start);
        expect(results.current.returned).toBe(true);
        expect(results.current.isEntryKept, 'An entry already on the sprite position must end').toBe(false);
        expect(results.current.sprite, 'An entry already on the sprite position must not move it').toEqual(results.start);
        let movingPosition = InterpolationFramesRecorder.interpolatedPosition(
            results.start,
            {x: results.moving.state.x - results.leftOff, y: results.moving.state.y - results.topOff},
            results.interpolationSpeed,
            precision
        );
        expect(results.moving.returned).toBe(true);
        expect(results.moving.isEntryKept, 'A moving entry must be kept').toBe(true);
        expect(results.moving.sprite, 'A moving entry must step the sprite with the Linear interpolation')
            .toEqual(movingPosition);
        expect(results.disabled.isEntryKept, 'The disabled interpolation must keep the entries').toBe(true);
        expect(results.disabled.sprite, 'The disabled interpolation must not move the sprite').toEqual(movingPosition);
        expect(results.stopped.state.mov, 'The real state must be stopped').toBe(false);
        expect(results.stopped.returned).toBe(true);
        expect(results.stopped.isEntryKept, 'A stopped entry must end').toBe(false);
        expect(results.stopped.sprite, 'A stopped entry must place the sprite on the state position').toEqual(
            InterpolationFramesRecorder.placedPosition(
                {x: results.stopped.state.x - results.leftOff, y: results.stopped.state.y - results.topOff},
                precision
            )
        );
        expect(results.withoutEngine.returned, 'Without player engine the interpolation must do nothing').toBe(false);
        expect(results.withoutEngine.isEntryKept, 'Without player engine the entries must be kept').toBe(true);
    }

    static expectObjectsBranches(results, objectKey)
    {
        let precision = InterpolationFramesRecorder.OBJECT_PRECISION;
        expect(results.withoutEntries, 'Without entries the objects interpolation must do nothing').toBe(false);
        expect(results.notBullet, 'An object key is not a bullet').toBe(false);
        expect(results.bulletWithoutEntry, 'A bullet without entry must not move').toBe(false);
        expect(results.objectWithoutEntry, 'An object without entry must not move').toBe(false);
        expect(results.missing, 'The entries without sprite or animation must be kept without moving').toEqual({
            bullet: false,
            object: false,
            isBulletEntryKept: true,
            isObjectEntryKept: true
        });
        expect(results.current.returned).toBe(true);
        expect(results.current.keys, 'The entries already on the sprite position must end').toEqual([]);
        expect(results.current.bullet, 'A bullet already on its body position must not move').toEqual(results.bulletStart);
        expect(results.current.object, 'An object already on its body position must not move').toEqual(results.start);
        let objectPosition = InterpolationFramesRecorder.interpolatedPosition(
            results.start,
            results.moving.objectState,
            results.interpolationSpeed,
            precision
        );
        expect(results.moving.returned).toBe(true);
        expect(results.moving.keys, 'The moving entries must be kept')
            .toEqual([TestSceneInterpolationBranches.PROBE_BULLET_KEY, objectKey]);
        expect(results.moving.bullet, 'A moving bullet must step with the Linear interpolation').toEqual(
            InterpolationFramesRecorder.interpolatedPosition(
                results.bulletStart,
                results.moving.bulletState,
                results.interpolationSpeed,
                precision
            )
        );
        expect(results.moving.object, 'A moving object must step with the Linear interpolation').toEqual(objectPosition);
        expect(results.moving.objectSprite, 'The object sprite must follow its animation').toEqual(objectPosition);
        expect(results.stopped.body.mov, 'The real body must be stopped').toBe(false);
        expect(results.stopped.returned).toBe(true);
        expect(results.stopped.keys, 'The stopped entries must end').toEqual([]);
        expect(results.stopped.bullet, 'A stopped bullet must be placed on its body position')
            .toEqual(InterpolationFramesRecorder.placedPosition(results.moving.bulletState, precision));
        expect(results.stopped.object, 'A stopped object must be placed on its body position')
            .toEqual({x: results.stopped.body.x, y: results.stopped.body.y});
        expect(results.stopped.objectSprite, 'The stopped object sprite must follow its animation')
            .toEqual({x: results.stopped.body.x, y: results.stopped.body.y});
    }

    static async runBranchesTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let pageErrors = InterpolationFramesRecorder.trackPageErrors(page);
        await SceneInterpolationShowcase.enableCurrentPlayerName(gameConfig, e2eGroup, longRun);
        let context = await MovementScenario.start(page, gameConfig, longRun);
        expect(context.npcKey, 'e2eNpcKey must be configured').toBeTruthy();
        await SceneInterpolationShowcase.placePlayerNearNpc(page, context, longRun);
        let sessionId = await page.evaluate(() => window.reldens.activeRoomEvents.room.sessionId);
        expect(
            await InterpolationFramesRecorder.waitForPlayerSpriteOnState(page, sessionId, false, context.navTimeout),
            'The player sprite must be on its stopped state before the branches run'
        ).toBe(true);
        expect(
            await InterpolationFramesRecorder.waitForObjectOnBody(page, context.npcKey, false, context.navTimeout),
            'The NPC animation must be on its stopped body before the branches run'
        ).toBe(true);
        await LongRunShowcase.startGameplayRecording(
            page,
            longRun,
            SceneInterpolationBranchesShowcase.PLAYER_SKIPPED_CAPTION
        );
        let playersResults = await SceneInterpolationProbe.runPlayersBranches(page);
        let objectsResults = await SceneInterpolationProbe.runObjectsBranches(page, context.npcKey);
        await SceneInterpolationBranchesShowcase.showResults(
            page,
            playersResults,
            objectsResults,
            context.npcKey,
            longRun
        );
        await screenshots.capture(page, 'interpolation-branches-done');
        TestSceneInterpolationBranches.expectPlayersBranches(playersResults);
        TestSceneInterpolationBranches.expectObjectsBranches(objectsResults, context.npcKey);
        expect(pageErrors, 'The client must not throw on the interpolation branches').toEqual([]);
    }

    static async runLayersDepthTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        await SceneInterpolationShowcase.enableCurrentPlayerName(gameConfig, e2eGroup, longRun);
        let context = await MovementScenario.start(page, gameConfig, longRun);
        let layersData = await SceneInterpolationProbe.readLayersDepths(page);
        let coverWalk = await SceneInterpolationShowcase.prepareCoverWalk(page, context, layersData, longRun);
        await LongRunShowcase.startGameplayRecording(page, longRun, sc.get(coverWalk, 'firstCaption', ''));
        await SceneInterpolationShowcase.showWalkUnderCover(page, context, layersData, coverWalk);
        await screenshots.capture(page, 'town-layers');
        expect(layersData, 'The active scene must have a map').toBeTruthy();
        expect(layersData.layers.length, 'Every map layer must be created').toBe(layersData.mapLayersCount);
        expect(
            layersData.layers.some(layer => 0 < layer.layerIndex && -1 !== layer.name.indexOf('over-player')),
            'The town must have an over player layer after the first one'
        ).toBe(true);
        expect(
            layersData.layers.map(layer => ({name: layer.name, depth: layer.depth})),
            'Every layer must get the depth of its name and position'
        ).toEqual(layersData.layers.map(layer => ({
            name: layer.name,
            depth: SceneInterpolationProbe.expectedLayerDepth(layer, layersData)
        })));
    }

    static async runOtherMapLayersTest(page, gameConfig, longRun)
    {
        await Login.loginAndEnterForest(page, gameConfig, longRun);
        let layersData = await SceneInterpolationProbe.readLayersDepths(page);
        expect(layersData.layers.length, 'Every forest map layer is created').toBe(layersData.mapLayersCount);
        expect(
            layersData.layers.map(layer => ({name: layer.name, depth: layer.depth})),
            'Every forest layer gets the depth of its name and position'
        ).toEqual(layersData.layers.map(layer => ({
            name: layer.name,
            depth: SceneInterpolationProbe.expectedLayerDepth(layer, layersData)
        })));
        let crafted = await page.evaluate(TestSceneInterpolationBranches.REGISTER_CRAFTED_LAYERS, {
            mapSize: TestSceneInterpolationBranches.CRAFTED_MAP,
            layersNamesList: [[], ['ground', 'e2e-failing-layer', 'over-player-last']]
        });
        expect(crafted[0], 'A map with zero layers registers nothing').toEqual({registered: false, layers: []});
        expect(crafted[1], 'A failed layer is skipped and the next layers keep registering').toEqual({
            registered: true,
            layers: [
                {name: 'ground', depth: 0},
                {name: 'over-player-last', depth: TestSceneInterpolationBranches.CRAFTED_MAP.height
                    * TestSceneInterpolationBranches.CRAFTED_MAP.tileHeight}
            ]
        });
    }

    static async runDisabledInterpolationTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let pageErrors = InterpolationFramesRecorder.trackPageErrors(page);
        await E2eSeedAndRestoreApi.overrideConfig(
            gameConfig,
            e2eGroup,
            TestSceneInterpolationBranches.CLIENT_INTERPOLATION_PATH,
            false
        );
        await SceneInterpolationShowcase.enableCurrentPlayerName(gameConfig, e2eGroup, longRun);
        let context = await MovementScenario.start(page, gameConfig, longRun);
        let walkTiles = await SceneInterpolationShowcase.findWalkTilesAwayFromNpcs(context, longRun);
        await ClientInterpolationShowcase.slowBody(gameConfig, context.roomName, context.playerName, longRun);
        await LongRunShowcase.startGameplayRecording(
            page,
            longRun,
            'Client interpolation off: the sprite jumps to every server state, with no steps in between'
        );
        let sessionId = await page.evaluate(() => window.reldens.activeRoomEvents.room.sessionId);
        let startPosition = await Phaser.getPlayerServerPosition(page);
        await InterpolationFramesRecorder.start(page, {players: [sessionId]});
        if(!await SceneInterpolationShowcase.walkAwayFromNpcs(page, context, walkTiles)){
            await Navigation.walkInDirection(page, 'ArrowRight', TestSceneInterpolationBranches.WALK_MS);
        }
        let isOnState = await InterpolationFramesRecorder.waitForPlayerSpriteOnState(
            page,
            sessionId,
            false,
            context.navTimeout
        );
        let summary = InterpolationFramesRecorder.summarize(
            await InterpolationFramesRecorder.stop(page),
            InterpolationFramesRecorder.PLAYER_KIND
        );
        let positions = await page.evaluate((playerKey) => {
            let scene = window.reldens.getActiveScene();
            let playerSprite = scene.player.players[playerKey];
            let playerState = window.reldens.activeRoomEvents.room.state.players.get(playerKey).state;
            if(!playerSprite || !playerState){
                return false;
            }
            return {
                isInterpolationEnabled: scene.clientInterpolation,
                state: {x: playerState.x, y: playerState.y, mov: playerState.mov},
                sprite: {x: playerSprite.x, y: playerSprite.y},
                offsets: {left: scene.player.leftOff, top: scene.player.topOff}
            };
        }, sessionId);
        await LongRunShowcase.showStep(
            page,
            'Walk ended: the scene update moved the sprite in '+summary.frames+' frames',
            longRun
        );
        await screenshots.capture(page, 'walked-with-the-interpolation-disabled');
        expect(positions.isInterpolationEnabled, 'The client interpolation must be disabled').toBe(false);
        expect(positions.state, 'The player state must have moved').not.toEqual({...startPosition, mov: false});
        expect(isOnState, 'The sprite must be on the walked state: '+sc.toJsonString({startPosition, ...positions}))
            .toBe(true);
        expect(summary.frames, 'The scene update must not move the sprite with the interpolation disabled').toBe(0);
        expect(pageErrors, 'The client must not throw with the interpolation disabled').toEqual([]);
    }

    static run()
    {
        test.describe('Scene Interpolation Branches', () => {
            test('player sprite follows the walking state with the client interpolation disabled', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestSceneInterpolationBranches.runDisabledInterpolationTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('scene interpolation skips the missing bodies, ends the entries in place and stops when disabled', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestSceneInterpolationBranches.runBranchesTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('scene map layers get the depth of their layer name and position', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestSceneInterpolationBranches.runLayersDepthTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('the forest layers and crafted maps get the depth of their layer name and position', async ({ page, gameConfig, longRun }) => {
                await TestSceneInterpolationBranches.runOtherMapLayersTest(page, gameConfig, longRun);
            });
        });
    }
}

TestSceneInterpolationBranches.run();
