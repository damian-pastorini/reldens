/**
 *
 * Reldens - Theme - CloudsEffect
 *
 * Draws semi-transparent clouds drifting over the scene map, configured by the room customData "weather.clouds".
 *
 */

class CloudsEffect
{

    constructor()
    {
        this.textureKey = 'weather-cloud';
        this.texturePath = '/assets/custom/effects/weather-cloud.png';
        this.millisecondsPerSecond = 1000;
        this.defaults = {
            quantity: 8,
            alpha: 0.2,
            speed: 40,
            direction: 1,
            speedVariation: 0.3,
            scaleMin: 1.5,
            scaleMax: 3.5,
            depth: 100000
        };
    }

    /**
     * @param {Object} scenePreloader
     * @returns {boolean}
     */
    preloadTexture(scenePreloader)
    {
        if(scenePreloader.textures.exists(this.textureKey)){
            return false;
        }
        scenePreloader.load.image(this.textureKey, this.texturePath);
        return true;
    }

    /**
     * @param {Object} sceneDynamic
     * @param {Object|boolean} cloudsConfig
     * @returns {Array<Object>}
     */
    create(sceneDynamic, cloudsConfig)
    {
        if(!sceneDynamic.textures.exists(this.textureKey)){
            return [];
        }
        let config = Object.assign({}, this.defaults, cloudsConfig);
        let mapWidth = sceneDynamic.map.widthInPixels;
        let mapHeight = sceneDynamic.map.heightInPixels;
        let clouds = [];
        for(let i = 0; i < config.quantity; i++){
            let cloud = sceneDynamic.add.image(Math.random() * mapWidth, Math.random() * mapHeight, this.textureKey);
            cloud.setAlpha(config.alpha);
            cloud.setScale(config.scaleMin + Math.random() * (config.scaleMax - config.scaleMin));
            cloud.setDepth(config.depth);
            let speedFactor = 1 - config.speedVariation + Math.random() * config.speedVariation * 2;
            cloud.driftSpeed = config.speed * config.direction * speedFactor;
            clouds.push(cloud);
        }
        let updateClouds = (time, delta) => {
            this.moveClouds(clouds, delta, mapWidth, mapHeight);
        };
        sceneDynamic.events.on('update', updateClouds);
        sceneDynamic.events.once('shutdown', () => {
            sceneDynamic.events.off('update', updateClouds);
        });
        return clouds;
    }

    /**
     * @param {Array<Object>} clouds
     * @param {number} delta
     * @param {number} mapWidth
     * @param {number} mapHeight
     */
    moveClouds(clouds, delta, mapWidth, mapHeight)
    {
        for(let cloud of clouds){
            cloud.x += cloud.driftSpeed * delta / this.millisecondsPerSecond;
            let halfWidth = cloud.displayWidth / 2;
            if(cloud.x > mapWidth + halfWidth){
                cloud.x = -halfWidth;
                cloud.y = Math.random() * mapHeight;
                continue;
            }
            if(cloud.x < -halfWidth){
                cloud.x = mapWidth + halfWidth;
                cloud.y = Math.random() * mapHeight;
            }
        }
    }

}

module.exports.CloudsEffect = CloudsEffect;
