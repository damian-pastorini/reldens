/**
 *
 * Reldens - ObjectAnimationsBuilder
 *
 * Creates the object animations with the real client AnimationEngine, using a preloader that records the frames range
 * requested to the Phaser animations manager instead of reading a texture.
 *
 */

const { AnimationEngine } = require('../../lib/objects/client/animation-engine');

class ObjectAnimationsBuilder
{

    /**
     * @param {Object} objectProps
     * @param {Object} animations
     * @returns {Object<string, Object>}
     */
    static build(objectProps, animations)
    {
        let gameManager = {config: {getWithoutLogs: (path, defaultValue) => defaultValue}, createdAnimations: {}};
        let currentPreloader = {
            objectsAnimations: {},
            anims: {generateFrameNumbers: (assetKey, frameData) => frameData, create: (animationData) => animationData}
        };
        new AnimationEngine(gameManager, Object.assign({enabled: true}, objectProps, {animations}), currentPreloader);
        return currentPreloader.objectsAnimations;
    }

}

module.exports.ObjectAnimationsBuilder = ObjectAnimationsBuilder;
