/**
 *
 * Reldens - Test Object Animation Frame Ranges
 *
 * Tests the objects animations are created on the client with the frames stored for each animation: the forest objects
 * animations against the forest scene data, the default animation of the forest fishing spots and enemies against their
 * stored frame start and end, and the animations of every forest level, from the first to the sixth one reached through
 * their change points, against the stored objects rows and objects animations rows of each level.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { Phaser } = require('./helpers/phaser');
const { ChangePointsSteps } = require('./helpers/change-points-steps');
const { ObjectAnimationFrameRangesReader } = require('./helpers/object-animation-frame-ranges-reader');
const { TimeConstants } = require('./helpers/time-constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestObjectAnimationFrameRanges
{

    static FOREST_DEFAULT_ASSETS = [
        'fish_spawn_forest_1',
        'fish_spawn_forest_2',
        'fish_spawn_forest_3',
        'fish_spawn_forest_4',
        'fish_spawn_forest_5',
        'fish_spawn_forest_6',
        'enemy_forest_1',
        'enemy_forest_2'
    ];

    static async expectStoredFramesCreated(context, roomName)
    {
        await ObjectAnimationFrameRangesReader.expectRoomFramesCreated(
            context.page,
            context.gameConfig,
            roomName,
            TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, context.longRun)
        );
    }

    static async runForestDefaultFramesTest(context)
    {
        let forestData = await Login.loginAndEnterForest(context.page, context.gameConfig, context.longRun);
        let assetKeys = TestObjectAnimationFrameRanges.FOREST_DEFAULT_ASSETS;
        for(let assetKey of assetKeys){
            await Phaser.waitForObjectByAssetKey(context.page, assetKey, forestData.sceneTimeout);
        }
        let storedRanges = await ObjectAnimationFrameRangesReader.fetchStoredDefaultRanges(context.gameConfig, assetKeys);
        let createdRanges = await ObjectAnimationFrameRangesReader.fetchDefaultRanges(context.page, assetKeys);
        expect([...new Set(createdRanges.map(range => range.key))].sort(), 'Every fishing spot and enemy has its default animation')
            .toEqual([...assetKeys].sort());
        expect(createdRanges, 'The default animations use the stored frame start and end')
            .toEqual(createdRanges.map(range => storedRanges[range.key]));
    }

    static async runForestLevelsFramesTest(context)
    {
        let levels = Login.FOREST_LEVELS;
        test.setTimeout(TimeConstants.forLongRun(
            TimeConstants.GAME_START + levels.length * (TimeConstants.ROOM_TRANSITION + TimeConstants.SCENE_LOAD),
            context.longRun
        ));
        await Login.loginAndEnterForest(context.page, context.gameConfig, context.longRun);
        await TestObjectAnimationFrameRanges.expectStoredFramesCreated(context, Login.FOREST_ROOM_NAME);
        let topology = await ChangePointsSteps.loadTopology(context.gameConfig);
        let player = {page: context.page, playerName: context.gameConfig.e2ePlayerName};
        for(let change of ChangePointsSteps.buildWalk(topology, levels)){
            await ChangePointsSteps.changeRoom(context, player, topology, change);
            await TestObjectAnimationFrameRanges.expectStoredFramesCreated(context, change.nextRoomName);
        }
    }

    static run()
    {
        test.describe('Object Animation Frame Ranges', () => {
            test('forest objects animations use the frames stored for each animation', async ({ page, screenshots, gameConfig, longRun }) => {
                test.setTimeout(TimeConstants.forLongRun(60000, longRun));
                let enemyKey = gameConfig.e2eEnemyKey || '';
                expect(enemyKey, 'e2eEnemyKey not configured').toBeTruthy();
                let forestData = await Login.loginAndEnterForest(page, gameConfig, longRun);
                await Phaser.waitForObjectByAssetKey(page, enemyKey, forestData.sceneTimeout);
                await screenshots.capture(page, 'object-animations-enemy-in-scene');
                let animationsFrames = await ObjectAnimationFrameRangesReader.fetchStoredAndCreated(page);
                expect(
                    animationsFrames.length,
                    'The forest objects must have animations with their own stored frames'
                ).toBeGreaterThan(0);
                expect(animationsFrames.map(frames => frames.created)).toEqual(
                    animationsFrames.map(frames => frames.stored)
                );
            });
            test('the forest fishing spots and enemies default animations use their stored frame start and end', async ({ page, gameConfig, longRun }) => {
                await TestObjectAnimationFrameRanges.runForestDefaultFramesTest({page, gameConfig, longRun});
            });
            test('every forest level objects animations are created with their stored frames', async ({ page, gameConfig, longRun }) => {
                await TestObjectAnimationFrameRanges.runForestLevelsFramesTest({page, gameConfig, longRun});
            });
        });
    }

}

TestObjectAnimationFrameRanges.run();
