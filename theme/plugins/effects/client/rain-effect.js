/**
 *
 * Reldens - Theme - RainEffect
 *
 * Emits rain drops over the camera view with a particles emitter, configured by the room customData "weather.rain".
 *
 */

class RainEffect
{

    constructor()
    {
        this.textureKey = 'weather-raindrop';
        this.millisecondsPerSecond = 1000;
        this.degreesPerRadian = 180 / Math.PI;
        this.defaults = {
            dropWidth: 2,
            dropHeight: 14,
            dropColor: 0xaecbeb,
            quantity: 4,
            frequency: 30,
            speedMin: 550,
            speedMax: 750,
            wind: -60,
            alpha: 0.45,
            fadeAlpha: 0.15,
            depth: 110000
        };
    }

    /**
     * @param {Object} sceneDynamic
     * @param {Object|boolean} rainConfig
     * @returns {Array<Object>}
     */
    create(sceneDynamic, rainConfig)
    {
        let config = Object.assign({}, this.defaults, rainConfig);
        if(!sceneDynamic.textures.exists(this.textureKey)){
            let graphics = sceneDynamic.add.graphics();
            graphics.fillStyle(config.dropColor, 1);
            graphics.fillRect(0, 0, config.dropWidth, config.dropHeight);
            graphics.generateTexture(this.textureKey, config.dropWidth, config.dropHeight);
            graphics.destroy();
        }
        let camera = sceneDynamic.cameras.main;
        let rain = sceneDynamic.add.particles(0, 0, this.textureKey, {
            x: {min: 0, max: camera.width},
            y: -config.dropHeight,
            lifespan: Math.ceil((camera.height + config.dropHeight) / config.speedMin * this.millisecondsPerSecond),
            speedX: config.wind,
            speedY: {min: config.speedMin, max: config.speedMax},
            rotate: Math.atan2(-config.wind, config.speedMin) * this.degreesPerRadian,
            quantity: config.quantity,
            frequency: config.frequency,
            alpha: {start: config.alpha, end: config.fadeAlpha}
        });
        rain.setScrollFactor(0);
        rain.setDepth(config.depth);
        return [rain];
    }

}

module.exports.RainEffect = RainEffect;
