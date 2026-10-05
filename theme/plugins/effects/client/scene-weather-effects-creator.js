/**
 *
 * Reldens - Theme - SceneWeatherEffectsCreator
 *
 * Creates the weather effects of each scene from the room customData "weather" (clouds and rain) and keeps them out
 * of the minimap camera.
 *
 */

const { CloudsEffect } = require('./clouds-effect');
const { RainEffect } = require('./rain-effect');

class SceneWeatherEffectsCreator
{

    constructor()
    {
        this.cloudsEffect = new CloudsEffect();
        this.rainEffect = new RainEffect();
        this.activeObjects = [];
    }

    /**
     * @param {Object} sceneDynamic
     * @returns {boolean}
     */
    createForScene(sceneDynamic)
    {
        this.activeObjects = [];
        let weather = sceneDynamic.params?.customData?.weather || false;
        if(!weather){
            return false;
        }
        let cloudsConfig = weather.clouds || false;
        if(cloudsConfig){
            this.activeObjects.push(...this.cloudsEffect.create(sceneDynamic, cloudsConfig));
        }
        let rainConfig = weather.rain || false;
        if(rainConfig){
            this.activeObjects.push(...this.rainEffect.create(sceneDynamic, rainConfig));
        }
        this.hideFromMinimap(sceneDynamic.minimap);
        return true;
    }

    /**
     * @param {Object|boolean} minimap
     * @returns {boolean}
     */
    hideFromMinimap(minimap)
    {
        if(!minimap){
            return false;
        }
        if(!minimap.minimapCamera){
            return false;
        }
        if(0 === this.activeObjects.length){
            return false;
        }
        minimap.minimapCamera.ignore(this.activeObjects);
        return true;
    }

}

module.exports.SceneWeatherEffectsCreator = SceneWeatherEffectsCreator;
