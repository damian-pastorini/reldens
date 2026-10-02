/**
 *
 * Reldens - Test Object Animation Frame Ranges
 *
 * Tests the forest objects animations are created on the client with the frames stored for each animation.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { Phaser } = require('./helpers/phaser');
const { ObjectAnimationFrameRangesReader } = require('./helpers/object-animation-frame-ranges-reader');
const { TimeConstants } = require('./helpers/time-constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestObjectAnimationFrameRanges
{
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
        });
    }
}

TestObjectAnimationFrameRanges.run();
