/**
 *
 * Reldens - ObjectAnimationsBuilder
 *
 * Creates the object animations with the real client AnimationEngine, using a preloader that records the frames range
 * requested to the Phaser animations manager instead of reading a texture. The sprite context builds the stubs the
 * engine sprite creation uses: a game manager with the given config values, the room preload assets and the active
 * scene; a preloader with the loaded textures, the given frame numbers and the asset loader recording its loads and
 * its complete callbacks; and a scene creating recording sprites (played animations, listeners, tints, depth and
 * destroy).
 *
 */

const { AnimationEngine } = require('../../lib/objects/client/animation-engine');
const { sc } = require('@reldens/utils');

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

    /**
     * @param {number} x
     * @param {number} y
     * @param {string} assetKey
     * @returns {Object}
     */
    static createSprite(x, y, assetKey)
    {
        let sprite = {x, y, assetKey, visible: true, body: {height: 64}, listeners: {}, playedAnimations: [], tints: []};
        sprite.anims = {play: (animationKey) => sprite.playedAnimations.push(animationKey)};
        sprite.on = (eventName, callback) => {
            sprite.listeners[eventName] = callback;
            return sprite;
        };
        sprite.setDepth = (depth) => Object.assign(sprite, {depth});
        sprite.setInteractive = () => sprite;
        sprite.setTint = (color) => sprite.tints.push(color);
        sprite.clearTint = () => sprite.tints.push(false);
        sprite.destroy = () => Object.assign(sprite, {destroyed: true});
        return sprite;
    }

    /**
     * @param {Object} context
     * @param {string} assetKey
     * @param {Object} frameData
     * @returns {Array<Object>}
     */
    static requestFrames(context, assetKey, frameData)
    {
        context.frameRequests.push(Object.assign({assetKey}, frameData));
        return context.frameNumbers;
    }

    /**
     * @param {Object} context
     * @param {Object} animationData
     * @returns {Object}
     */
    static createAnimation(context, animationData)
    {
        let animation = Object.assign({destroyed: false}, animationData);
        animation.destroy = () => Object.assign(animation, {destroyed: true});
        context.createdAnimations.push(animation);
        return animation;
    }

    /**
     * @param {Object} context
     * @param {number} x
     * @param {number} y
     * @param {string} assetKey
     * @returns {Object}
     */
    static addSprite(context, x, y, assetKey)
    {
        let sprite = ObjectAnimationsBuilder.createSprite(x, y, assetKey);
        context.sprites.push(sprite);
        return sprite;
    }

    /**
     * @param {Object} options
     * @returns {Object}
     */
    static createSpriteContext(options)
    {
        let context = {
            frameNumbers: sc.get(options, 'frameNumbers', []),
            frameRequests: [],
            createdAnimations: [],
            loadedSpritesheets: [],
            loadCallbacks: [],
            sprites: []
        };
        context.scene = {objectsAnimations: {}, physics: {add: {}}};
        context.scene.physics.add.sprite = (x, y, assetKey) => ObjectAnimationsBuilder.addSprite(context, x, y, assetKey);
        let configValues = sc.get(options, 'configValues', {});
        context.gameManager = {
            config: {getWithoutLogs: (path, defaultValue) => sc.get(configValues, path, defaultValue)},
            createdAnimations: {},
            events: {emitSync: () => true},
            activeRoomEvents: {getActiveScene: () => context.scene, roomData: {preloadAssets: sc.get(options, 'preloadAssets', {})}}
        };
        context.preloader = {objectsAnimations: {}, anims: {textureManager: {list: {}}}, load: {}};
        for(let textureKey of sc.get(options, 'textureKeys', [])){
            context.preloader.anims.textureManager.list[textureKey] = true;
        }
        context.preloader.anims.generateFrameNumbers = (assetKey, data) => this.requestFrames(context, assetKey, data);
        context.preloader.anims.create = (animationData) => ObjectAnimationsBuilder.createAnimation(context, animationData);
        context.preloader.load.spritesheet = (key, file, params) => context.loadedSpritesheets.push({key, file, params});
        context.preloader.load.once = (eventName, callback) => context.loadCallbacks.push(callback);
        context.preloader.load.start = () => true;
        return context;
    }

    static createEngine = (context, props) => new AnimationEngine(context.gameManager, props, context.preloader);

}

module.exports.ObjectAnimationsBuilder = ObjectAnimationsBuilder;
