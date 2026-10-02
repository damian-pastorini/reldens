/**
 *
 * Reldens - Test Rain Effect
 *
 */

const { BaseTest } = require('./base-test');
const { RainEffect } = require('../theme/plugins/effects/client/rain-effect');

class TestRainEffect extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.cameraSize = {width: 800, height: 600};
        this.customDrops = {dropWidth: 4, dropHeight: 20, dropColor: 0xffffff};
    }

    createSceneDynamic(generatedTextures)
    {
        return {
            textures: {exists: (textureKey) => 0 < generatedTextures.filter(texture => texture.key === textureKey).length},
            add: {
                graphics: () => ({
                    fillStyle: () => true,
                    fillRect: () => true,
                    generateTexture: (key, width, height) => generatedTextures.push({key, width, height}),
                    destroy: () => true
                }),
                particles: (x, y, textureKey) => ({textureKey, setScrollFactor: () => true, setDepth: () => true})
            },
            cameras: {main: this.cameraSize}
        };
    }

    async testRoomsWithDifferentDropsUseTheirOwnTexture()
    {
        await this.test('a room with other drop size and color gets its own drop texture', async () => {
            let generatedTextures = [];
            let rainEffect = new RainEffect();
            let defaultRain = [...rainEffect.create(this.createSceneDynamic(generatedTextures), true)].pop();
            let customRain = [...rainEffect.create(this.createSceneDynamic(generatedTextures), this.customDrops)].pop();
            this.assert.notStrictEqual(customRain.textureKey, defaultRain.textureKey);
            this.assert.deepStrictEqual(
                generatedTextures.map(texture => texture.key),
                [defaultRain.textureKey, customRain.textureKey]
            );
            this.assert.deepStrictEqual(
                [...generatedTextures].pop(),
                {key: customRain.textureKey, width: this.customDrops.dropWidth, height: this.customDrops.dropHeight}
            );
        });
    }

    async testRoomsWithTheSameDropsShareTheTexture()
    {
        await this.test('the rooms with the same drop size and color reuse the generated drop texture', async () => {
            let generatedTextures = [];
            let rainEffect = new RainEffect();
            let firstRain = [...rainEffect.create(this.createSceneDynamic(generatedTextures), true)].pop();
            let secondRain = [...rainEffect.create(this.createSceneDynamic(generatedTextures), true)].pop();
            this.assert.strictEqual(secondRain.textureKey, firstRain.textureKey);
            this.assert.strictEqual(generatedTextures.length, 1);
        });
    }

}

module.exports.TestRainEffect = TestRainEffect;
