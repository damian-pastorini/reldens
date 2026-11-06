/**
 *
 * Reldens - Test Skins Sprites Preloader
 *
 */

const { BaseTest } = require('./base-test');
const { GameplayPlayerBuilder } = require('./fixtures/gameplay-player-builder');
const { SkinsSpritesPreloader } = require('../lib/users/client/skins-sprites-preloader');
const { UsersConst } = require('../lib/users/constants');

class TestSkinsSpritesPreloader extends BaseTest
{

    createGameManager(skinsKeys)
    {
        return {
            config: GameplayPlayerBuilder.createConfig({[UsersConst.SKINS.CONFIG_PATHS.KEYS]: skinsKeys}),
            initialGameData: {classesData: {'1': {key: 'journeyman'}, '2': {key: 'sorcerer'}}}
        };
    }

    createUiScene()
    {
        let uiScene = {playerSpriteSize: {frameWidth: 52, frameHeight: 71}, loadedSpritesheets: []};
        uiScene.load = {
            spritesheet: (key, path, size) => uiScene.loadedSpritesheets.push({key, path, size})
        };
        return uiScene;
    }

    createPreloadScene(existingTextures)
    {
        let preloadScene = {createdAnimations: []};
        preloadScene.textures = {exists: (textureKey) => -1 !== existingTextures.indexOf(textureKey)};
        preloadScene.createPlayerAnimations = (avatarKey) => preloadScene.createdAnimations.push(avatarKey);
        return preloadScene;
    }

    async testOnlyTheSkinsThatAreNotClassPathsAreLoaded()
    {
        await this.test('only the configured skins that are not class paths are loaded', async () => {
            let preloader = new SkinsSpritesPreloader({gameManager: this.createGameManager(['warlock', 'sorcerer'])});
            let uiScene = this.createUiScene();
            this.assert.strictEqual(preloader.preloadSkins(uiScene), 1);
            this.assert.deepStrictEqual(uiScene.loadedSpritesheets, [{
                key: 'warlock',
                path: '/assets/custom/sprites/warlock.png',
                size: {frameWidth: 52, frameHeight: 71}
            }]);
        });
    }

    async testInvalidSkinsConfigLoadsNothing()
    {
        await this.test('a skins config that is not a list loads nothing', async () => {
            let preloader = new SkinsSpritesPreloader({gameManager: this.createGameManager('warlock')});
            let uiScene = this.createUiScene();
            this.assert.strictEqual(preloader.preloadSkins(uiScene), 0);
            this.assert.deepStrictEqual(uiScene.loadedSpritesheets, []);
        });
    }

    async testSkinsAnimationsAreCreatedOnceForTheLoadedTextures()
    {
        await this.test('the skins animations are created once and only for the loaded textures', async () => {
            let gameManager = this.createGameManager(['warlock', 'paladin']);
            let preloader = new SkinsSpritesPreloader({gameManager});
            let preloadScene = this.createPreloadScene(['warlock']);
            this.assert.strictEqual(preloader.createSkinsAnimations(preloadScene), 1);
            this.assert.strictEqual(preloader.createSkinsAnimations(preloadScene), 0);
            this.assert.deepStrictEqual(preloadScene.createdAnimations, ['warlock']);
            this.assert.deepStrictEqual(gameManager.mappedAvatars, {warlock: 'warlock'});
        });
    }

}

module.exports.TestSkinsSpritesPreloader = TestSkinsSpritesPreloader;
