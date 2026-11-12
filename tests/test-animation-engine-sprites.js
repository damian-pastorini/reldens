/**
 *
 * Reldens - Test Animation Engine Sprites
 *
 */

const { BaseTest } = require('./base-test');
const { ObjectAnimationsBuilder } = require('./fixtures/object-animations-builder');

class TestAnimationEngineSprites extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.doorProps = {
            enabled: true,
            key: 'door_house_3',
            id: 19,
            asset_key: 'door_house_3',
            frameStart: 0,
            frameEnd: 3,
            x: 400,
            y: 300,
            positionFix: {y: -22}
        };
        this.doorAsset = {
            asset_type: 'spritesheet',
            asset_key: 'door_house_3',
            asset_file: 'door-a-x3.png',
            extra_params: '{"frameWidth":32,"frameHeight":64}'
        };
        this.doorFrames = [0, 1, 2, 3].map(frame => ({key: 'door_house_3', frame}));
        this.doorContextOptions = {textureKeys: ['door_house_3'], frameNumbers: this.doorFrames, preloadAssets: {door: this.doorAsset}};
        this.highlightColorPath = 'client/ui/animations/highlightColor';
    }

    createDoorEngine(contextOptions, props)
    {
        let context = ObjectAnimationsBuilder.createSpriteContext(Object.assign({}, this.doorContextOptions, contextOptions));
        context.engine = ObjectAnimationsBuilder.createEngine(context, Object.assign({}, this.doorProps, props));
        return context;
    }

    async testDisabledAnimationCreatesNothing()
    {
        await this.test('a disabled animation creates no animation and no sprite', async () => {
            let context = this.createDoorEngine({}, {enabled: false});
            this.assert.deepStrictEqual(
                [context.engine.createAnimation(), context.createdAnimations.length, context.sprites.length],
                [false, 0, 0]
            );
        });
    }

    async testMissingTextureIsLoadedAndTheSpriteCreatedAfter()
    {
        await this.test('a sprite sheet not loaded yet is loaded on demand and the sprite is created after it', async () => {
            let context = this.createDoorEngine({textureKeys: []}, {});
            this.assert.strictEqual(context.engine.createAnimation(), false);
            this.assert.deepStrictEqual(context.loadedSpritesheets, [{
                key: this.doorAsset.asset_key,
                file: '/assets/custom/sprites/'+this.doorAsset.asset_file,
                params: {frameWidth: 32, frameHeight: 64}
            }]);
            context.preloader.anims.textureManager.list[this.doorAsset.asset_key] = true;
            context.loadCallbacks.shift()();
            this.assert.deepStrictEqual(
                [context.sprites.length, context.scene.objectsAnimations[this.doorProps.key] === context.engine],
                [1, true]
            );
        });
    }

    async testAssetMissingFromThePreloadAssetsLoadsNothing()
    {
        await this.test('an asset missing from the room preload assets loads nothing and creates no sprite', async () => {
            let context = this.createDoorEngine({textureKeys: [], preloadAssets: {}}, {});
            this.assert.deepStrictEqual(
                [context.engine.createAnimation(), context.loadedSpritesheets, context.engine.missingAssetLoadRequested, context.sprites],
                [false, [], false, []]
            );
        });
    }

    async testTextureStillMissingAfterItsLoadIsNotRequestedAgain()
    {
        await this.test('a texture still missing after its load request is not requested again', async () => {
            let context = this.createDoorEngine({textureKeys: []}, {});
            context.engine.createAnimation();
            context.loadCallbacks.shift()();
            this.assert.deepStrictEqual(
                [context.loadedSpritesheets.length, context.loadCallbacks.length, context.sprites.length],
                [1, 0, 0]
            );
        });
    }

    async testFrameSizeMismatchCreatesNoSpriteAndReportsOnce()
    {
        await this.test('a frame size mismatch creates no animation nor sprite and is reported once', async () => {
            let context = this.createDoorEngine({frameNumbers: []}, {});
            let secondEngine = ObjectAnimationsBuilder.createEngine(context, Object.assign({}, this.doorProps));
            this.assert.deepStrictEqual(
                [context.engine.createAnimation(), secondEngine.createAnimation(), context.createdAnimations.length, context.sprites.length],
                [false, false, 0, 0]
            );
            this.assert.deepStrictEqual(context.gameManager.reportedSpriteMismatch, {[this.doorAsset.asset_key]: true});
        });
    }

    async testAutoStartPlaysOnlyAnAnimationWithFrames()
    {
        await this.test('autoStart plays an animation of several frames and a single frame or autoStart off plays nothing', async () => {
            let cases = [
                this.createDoorEngine({}, {autoStart: true}),
                this.createDoorEngine({frameNumbers: [this.doorFrames[0]]}, {autoStart: true}),
                this.createDoorEngine({}, {autoStart: false})
            ];
            for(let context of cases){
                context.engine.createAnimation();
            }
            this.assert.deepStrictEqual(cases.map(context => context.sprites[0].playedAnimations), [[this.doorProps.key], [], []]);
        });
    }

    async testDestroyOnCompleteDestroysTheSpriteAndTheAnimation()
    {
        await this.test('an animation with destroyOnComplete destroys its sprite and its animation when it completes', async () => {
            let context = this.createDoorEngine({}, {destroyOnComplete: true});
            context.engine.createAnimation();
            context.sprites[0].listeners.animationcomplete();
            this.assert.deepStrictEqual([context.sprites[0].destroyed, context.createdAnimations[0].destroyed], [true, true]);
        });
    }

    async testHighlightOnOverUsesTheConfiguredColor()
    {
        await this.test('the hover highlight tints the sprite with the configured color only with highlightOnOver on', async () => {
            let highlighted = this.createDoorEngine({configValues: {[this.highlightColorPath]: '0xff0000'}}, {isInteractive: true});
            highlighted.engine.createAnimation();
            highlighted.sprites[0].listeners.pointerover();
            highlighted.sprites[0].listeners.pointerout();
            let plain = this.createDoorEngine({}, {isInteractive: true, highlightOnOver: false});
            plain.engine.createAnimation();
            this.assert.deepStrictEqual(highlighted.sprites[0].tints, ['0xff0000', false]);
            this.assert.deepStrictEqual(Object.keys(plain.sprites[0].listeners), ['pointerdown']);
        });
    }

    async testPositionFixPlacesTheSprite()
    {
        await this.test('the sprite of an object with positionFix is placed on the fixed position', async () => {
            let fixed = this.createDoorEngine({}, {});
            fixed.engine.createAnimation();
            let plain = this.createDoorEngine({}, {positionFix: false});
            plain.engine.createAnimation();
            this.assert.deepStrictEqual(
                [[fixed.sprites[0].x, fixed.sprites[0].y], [plain.sprites[0].x, plain.sprites[0].y]],
                [[this.doorProps.x, this.doorProps.y + this.doorProps.positionFix.y], [this.doorProps.x, this.doorProps.y]]
            );
        });
    }

    async testCreatedAnimationsAreReusedInAVisitedRoom()
    {
        await this.test('the animations created on a first visit are reused when the room is entered again', async () => {
            let animations = {door_house_3_open: {start: 0, end: 3}};
            let context = this.createDoorEngine({}, {animations});
            context.engine.createAnimation();
            let againEngine = ObjectAnimationsBuilder.createEngine(context, Object.assign({}, this.doorProps, {animations}));
            againEngine.createAnimation();
            this.assert.deepStrictEqual(
                [context.createdAnimations.map(animation => animation.key), againEngine.currentAnimation === context.engine.currentAnimation],
                [['door_house_3_open', this.doorProps.key], true]
            );
        });
    }

    async testSameAnimationKeyKeepsTheFirstObjectFrames()
    {
        await this.test('two objects declaring the same animation key keep the frames of the first one', async () => {
            let context = this.createDoorEngine({}, {animations: {shared_open: {start: 0, end: 1}}});
            ObjectAnimationsBuilder.createEngine(context, Object.assign({}, this.doorProps, {animations: {shared_open: {start: 2, end: 3}}}));
            this.assert.deepStrictEqual(
                context.frameRequests.map(request => [request.start, request.end]),
                [[0, 1]]
            );
        });
    }

    async testAnimationWithItsOwnAssetKey()
    {
        await this.test('an animation with its own asset key reads its frames from that sprite sheet', async () => {
            let context = this.createDoorEngine({}, {animations: {door_other_open: {asset_key: 'door_house_4', start: 0, end: 3}}});
            this.assert.deepStrictEqual(
                [context.frameRequests[0].assetKey, context.createdAnimations[0].asset_key],
                ['door_house_4', 'door_house_4']
            );
        });
    }

}

module.exports.TestAnimationEngineSprites = TestAnimationEngineSprites;
