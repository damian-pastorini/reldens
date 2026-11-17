/**
 *
 * Reldens - Test Scene Interpolation Entries
 *
 * Tests the live scene objects interpolation (SceneDynamic.processObjectsPositionInterpolation) with crafted entries
 * (exclusive group, the town moving objects paused, every crafted sprite and entry removed after its step): a bullet
 * sprite 0.49 pixels away from its moving entry is on its position (the positions are rounded) and the entry ends
 * without moving it, a bullet sprite 0.5 pixels away keeps its entry and steps with the Linear interpolation, and an
 * object animation whose key has "bullet" in it (it has no bullet sprite) is moved by the object path.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { MovementScenario } = require('./helpers/movement-scenario');
const { InterpolationFramesRecorder } = require('./helpers/interpolation-frames-recorder');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestSceneInterpolationEntries
{

    static START = {x: 100, y: 100};
    static ALMOST_ON_POSITION = {x: 100.49, y: 100};
    static HALF_PIXEL_AWAY = {x: 100.5, y: 100};
    static OBJECT_TARGET = {x: 140, y: 100};
    static PROBE_ENTRIES = (crafted) => {
        let scene = window.reldens.getActiveScene();
        let objectsPlugin = window.reldens.getFeature('objects');
        let runEntry = (key, entity, entry, isBulletSprite) => {
            if(isBulletSprite){
                objectsPlugin.bullets[key] = entity;
            }
            if(!isBulletSprite){
                scene.objectsAnimations[key] = entity;
            }
            scene.interpolateObjectsPositions[key] = Object.assign({mov: true}, entry);
            scene.processObjectsPositionInterpolation();
            let result = {position: {x: entity.x, y: entity.y}, isEntryKept: key in scene.interpolateObjectsPositions};
            delete objectsPlugin.bullets[key];
            delete scene.objectsAnimations[key];
            delete scene.interpolateObjectsPositions[key];
            return result;
        };
        let craftAnimation = () => ({
            x: crafted.start.x,
            y: crafted.start.y,
            key: 'e2e-bullet-object',
            autoStart: false,
            sceneSprite: {anims: {play: () => true, stop: () => true}},
            updateObjectDepth: () => 0,
            updateObjectAndSpritePositions: function(x, y){
                this.x = x;
                this.y = y;
            }
        });
        return {
            interpolationSpeed: scene.interpolationSpeed,
            almostOnPosition: runEntry('e2e-rounding-bullet-a', {...crafted.start}, crafted.almostOnPosition, true),
            halfPixelAway: runEntry('e2e-rounding-bullet-b', {...crafted.start}, crafted.halfPixelAway, true),
            bulletKeyObject: runEntry('e2e-bullet-object', craftAnimation(), crafted.objectTarget, false)
        };
    };

    static async runEntriesTest(context)
    {
        let pageErrors = InterpolationFramesRecorder.trackPageErrors(context.page);
        await MovementScenario.start(context.page, context.gameConfig, context.longRun);
        let results = await context.page.evaluate(TestSceneInterpolationEntries.PROBE_ENTRIES, {
            start: TestSceneInterpolationEntries.START,
            almostOnPosition: TestSceneInterpolationEntries.ALMOST_ON_POSITION,
            halfPixelAway: TestSceneInterpolationEntries.HALF_PIXEL_AWAY,
            objectTarget: TestSceneInterpolationEntries.OBJECT_TARGET
        });
        let precision = InterpolationFramesRecorder.OBJECT_PRECISION;
        expect(results.almostOnPosition, 'A sprite 0.49 pixels away ends its entry without moving').toEqual({
            position: TestSceneInterpolationEntries.START,
            isEntryKept: false
        });
        expect(results.halfPixelAway, 'A sprite 0.5 pixels away keeps its entry and steps with the interpolation').toEqual({
            position: InterpolationFramesRecorder.interpolatedPosition(
                TestSceneInterpolationEntries.START,
                TestSceneInterpolationEntries.HALF_PIXEL_AWAY,
                results.interpolationSpeed,
                precision
            ),
            isEntryKept: true
        });
        expect(results.bulletKeyObject, 'An object animation with bullet in its key is moved by the object path').toEqual({
            position: InterpolationFramesRecorder.interpolatedPosition(
                TestSceneInterpolationEntries.START,
                TestSceneInterpolationEntries.OBJECT_TARGET,
                results.interpolationSpeed,
                precision
            ),
            isEntryKept: true
        });
        expect(pageErrors, 'The client never throws on the crafted entries').toEqual([]);
    }

    static run()
    {
        test.describe('Scene Interpolation Entries', () => {
            test('the rounded entry boundary and an object key with bullet follow their interpolation paths', async ({ page, gameConfig, longRun }) => {
                await TestSceneInterpolationEntries.runEntriesTest({page, gameConfig, longRun});
            });
        });
    }

}

TestSceneInterpolationEntries.run();
