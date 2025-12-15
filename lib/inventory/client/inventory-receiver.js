/**
 *
 * Reldens - InventoryReceiver
 *
 * Handles inventory item animations and visual effects on the client side.
 * Extends Receiver from items-system to process item execution animations.
 *
 */

const { InventoryConst } = require('../constants');
const { GameConst } = require('../../game/constants');
const { Receiver } = require('@reldens/items-system');
const { ErrorManager, Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../game/client/game-manager').GameManager} GameManager
 */
class InventoryReceiver extends Receiver
{

    /**
     * @param {Object} props
     */
    constructor(props)
    {
        if(!sc.hasOwn(props, 'gameManager')){
            ErrorManager.error('InventoryReceiver gameManager not specified.');
        }
        super(props);
        /** @type {GameManager} */
        this.gameManager = props.gameManager;
        /** @type {Object<string, Object>} */
        this.itemSprites = {};
        /** @type {Object<string, Object>} */
        this.itemsAnimations = {};
    }

    /**
     * @param {Object} message
     * @returns {boolean|void}
     */
    onExecuting(message)
    {
        // @TODO - BETA - Improve, split in several classes, methods and functionalities.
        let item = message.item;
        if(!sc.hasOwn(item, 'animationData')){
            Logger.warning('Item does not contain animation data.', message);
            return false;
        }
        let animKey = InventoryConst.ANIMATION_KEY_PREFIX+item.key;
        let currentScene = this.gameManager.getActiveScene();
        let existentAnimation = this.itemSprites[animKey]
            && this.itemSprites[animKey].anims
            && currentScene.anims.get(animKey);
        if(existentAnimation){
            Logger.debug('Animation already exists, playing: '+animKey);
            this.playSpriteAnimation(animKey, item);
            return false;
        }
        // @TODO - BETA - Remove hardcoded file extension.
        currentScene.load.spritesheet(animKey, '/assets/custom/sprites/'+item.key+GameConst.FILES.EXTENSIONS.PNG, {
            frameWidth: item.animationData.frameWidth || 64,
            frameHeight: item.animationData.frameHeight || 64
        }).on('loaderror', (event) => {
            Logger.error('Sprite load error: '+animKey, event);
        });
        currentScene.load.on('complete', () => {
            Logger.debug('Scene load complete, playing: '+animKey);
            this.createItemSprites(animKey, item, message, currentScene);
        });
        currentScene.load.start();
    }

    /**
     * @param {string} animKey
     * @param {Object} item
     * @param {Object} message
     * @param {Object} currentScene
     * @returns {boolean|void}
     */
    createItemSprites(animKey, item, message, currentScene)
    {
        let targetId = this.extractTargetId(item, message, currentScene);
        if(!targetId){
            Logger.error('Target ID not found.');
            return false;
        }
        let playerSprite = sc.get(currentScene.player.players, targetId, false);
        if(!playerSprite){
            Logger.error('Player sprite not found by target ID.');
            return false;
        }
        // @TODO - BETA - Make all the defaults configurable.
        let animationFromScene = currentScene.anims.get(animKey);
        if(!animationFromScene){
            Logger.debug('Creating new animation on scene: '+animKey);
            animationFromScene = currentScene.anims.create({
                key: animKey,
                frames: currentScene.anims.generateFrameNumbers(animKey, {
                    start: item.animationData.start || 0,
                    end: item.animationData.end || 1
                }),
                frameRate: sc.get(item.animationData, 'frameRate', currentScene.configuredFrameRate),
                repeat: item.animationData.repeat || 3,
                hideOnComplete: sc.get(item.animationData, 'hide', true),
                showOnStart: sc.get(item.animationData, 'showOnStart', true),
            });
        }
        this.itemsAnimations[animKey] = animationFromScene;
        let x = sc.get(item.animationData, 'fixedX', (item.animationData.usePlayerPosition ? playerSprite.x : 0));
        let y = sc.get(item.animationData, 'fixedY', (item.animationData.usePlayerPosition ? playerSprite.y : 0));
        this.itemSprites[animKey] = currentScene.physics.add.sprite(x, y, animKey);
        this.itemSprites[animKey] = this.itemSprites[animKey].setDepth(90000);
        this.itemSprites[animKey].depthByPlayer = 'above';
        if(item.animationData.followPlayer){
            playerSprite.moveSprites[animKey] = this.itemSprites[animKey];
        }
        // @TODO - BETA - Make auto-destroy configurable.
        Logger.debug('Playing sprite: '+animKey);
        this.playSpriteAnimation(animKey, item).on('animationcomplete', () => {
            if(item.animationData.destroyOnComplete){
                this.destroyAnimation(item, animKey, playerSprite);
            }
        });
    }

    /**
     * @param {string} animKey
     * @param {Object} item
     * @returns {Object|boolean}
     */
    playSpriteAnimation(animKey, item)
    {
        // @TODO - BETA - Make closeInventoryOnUse and ignoreIfPlaying default values configurable.
        let closeInventoryOnUse = sc.get(item.animationData, 'closeInventoryOnUse', false);
        if(closeInventoryOnUse){
            this.gameManager.gameDom.getElement('#inventory-close')?.click();
        }
        let spriteAnims = this.itemSprites[animKey].anims;
        if(!spriteAnims){
            Logger.error('Sprite animation not found: '+animKey);
            return false;
        }
        spriteAnims.visible = true;
        return spriteAnims.play(animKey, sc.get(item.animationData, 'ignoreIfPlaying', true));
    }

    /**
     * @param {Object} item
     * @param {string} animKey
     * @param {Object} playerSprite
     */
    destroyAnimation(item, animKey, playerSprite)
    {
        this.itemSprites[animKey].destroy();
        delete this.itemSprites[animKey];
        delete this.itemsAnimations[animKey];
        if(item.animationData.followPlayer){
            delete playerSprite.moveSprites[animKey];
        }
        Logger.debug('Animation and sprite destroyed: '+animKey);
    }

    /**
     * @param {Object} item
     * @param {Object} message
     * @param {Object} currentScene
     * @returns {number|boolean}
     */
    extractTargetId(item, message, currentScene)
    {
        if(item.animationData.startsOnTarget && message.target?.playerId){
            return message.target.playerId;
        }
        return currentScene.player?.playerId || false;
    }

}

module.exports.InventoryReceiver = InventoryReceiver;
