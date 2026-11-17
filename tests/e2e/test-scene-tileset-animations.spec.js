/**
 *
 * Reldens - Test Scene Tileset Animations
 *
 * Tests the animated tiles of the scene maps (exclusive group): the town scene registers one tileset animation for
 * every layer with animated tiles of its animated tilesets (the sample town and forest maps have tile animations),
 * every town tileset animation is destroyed when the player changes to the forest (its destroy is wrapped to count the
 * calls) and the forest scene registers its own tileset animations.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { TeamSteps } = require('./helpers/team-steps');
const { MovementScenario } = require('./helpers/movement-scenario');
const { TimeConstants } = require('./helpers/time-constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestSceneTilesetAnimations
{

    static READ_TILESET_ANIMATIONS = () => [window.reldens.getActiveScene()].map((scene) => ({
        sceneKey: scene.key,
        useTsAnimation: scene.useTsAnimation,
        tilesetAnimations: scene.tilesetAnimations.length,
        animatedTiles: scene.tilesetAnimations.reduce((total, tilesetAnimation) => total + tilesetAnimation.animations.length, 0)
    })).pop();
    static COUNT_DESTROYED = () => {
        window.e2eDestroyedTilesetAnimations = 0;
        for(let tilesetAnimation of window.reldens.getActiveScene().tilesetAnimations){
            let destroyAnimation = tilesetAnimation.destroy.bind(tilesetAnimation);
            tilesetAnimation.destroy = () => {
                window.e2eDestroyedTilesetAnimations++;
                destroyAnimation();
            };
        }
    };

    static async runTilesetAnimationsTest(context)
    {
        let player = (await TeamSteps.enterPlayers(context, 1)).shift();
        let town = await player.page.evaluate(TestSceneTilesetAnimations.READ_TILESET_ANIMATIONS);
        expect(
            [town.sceneKey, town.useTsAnimation, 0 < town.tilesetAnimations, 0 < town.animatedTiles],
            'The town scene registers its tileset animations'
        ).toEqual([Login.TOWN_ROOM_NAME, true, true, true]);
        await player.page.evaluate(TestSceneTilesetAnimations.COUNT_DESTROYED);
        await TeamSteps.changeScene(context, player, Login.TOWN_ROOM_NAME, Login.FOREST_ROOM_NAME);
        await MovementScenario.waitForReadyScene(player.page);
        await expect.poll(
            async () => player.page.evaluate(() => window.e2eDestroyedTilesetAnimations),
            {message: 'Every town tileset animation is destroyed on the scene change', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(town.tilesetAnimations);
        let forest = await player.page.evaluate(TestSceneTilesetAnimations.READ_TILESET_ANIMATIONS);
        expect(
            [forest.sceneKey, forest.useTsAnimation, 0 < forest.tilesetAnimations, 0 < forest.animatedTiles],
            'The forest scene registers its own tileset animations'
        ).toEqual([Login.FOREST_ROOM_NAME, true, true, true]);
    }

    static run()
    {
        test.describe('Scene Tileset Animations', () => {
            test('the tileset animations are registered on the scene creation and destroyed on the scene change', async ({ page, gameConfig, longRun }) => {
                await TestSceneTilesetAnimations.runTilesetAnimationsTest({page, gameConfig, longRun});
            });
        });
    }

}

TestSceneTilesetAnimations.run();
