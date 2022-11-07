/**
 *
 * Reldens - InventoryReceiver
 *
 */

const { Receiver } = require('@reldens/items-system');
const { ErrorManager, Logger, sc } = require('@reldens/utils');

class InventoryReceiver extends Receiver
{

    constructor(props)
    {
        if(!sc.hasOwn(props, 'gameManager')){
            ErrorManager.error('InventoryReceiver gameManager not specified.');
        }
        super(props);
        this.gameManager = props.gameManager;
        this.itemSprites = {};
    }

    onExecuting(message)
    {
        // @TODO - BETA - Improve, split in several classes, methods and functionalities.
        let item = message.item;
        if(!sc.hasOwn(item, 'animationData')){
            return false;
        }
        let animKey = 'aK_'+item.key;
        let currentScene = this.gameManager.getActiveScene();
        // TODO: *PHASER* This call must be done on the SceneDriver not on the Phaser's scene.
        currentScene.load.spritesheet(animKey, 'assets/custom/sprites/'+item.key+'.png', {
            frameWidth: item.animationData.frameWidth || 64,
            frameHeight: item.animationData.frameHeight || 64
        });
        // TODO: *PHASER* This call must be done on the SceneDriver not on the Phaser's scene.
        currentScene.load.on('complete', () => {
            return this.createItemSprites(animKey, item, message, currentScene);
        });
        currentScene.load.start();
    }

    createItemSprites(animKey, item, message, currentScene)
    {
        if(sc.hasOwn(this.itemSprites, animKey)){
            Logger.error('Sprite already running for item: '+animKey);
            return false;
        }
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
        let x = 0, y = 0;
        if(item.animationData.usePlayerPosition){
            // TODO: *PHASER* This call must be done on the SceneDriver not on the Phaser's scene.
            currentScene.anims.create({
                key: animKey,
                frames: currentScene.anims.generateFrameNumbers(animKey, {
                    start: item.animationData.start || 0,
                    end: item.animationData.end || 1
                }),
                frameRate: sc.hasOwn(item.animationData, 'rate') ?
                    item.animationData.rate : currentScene.configuredFrameRate,
                repeat: item.animationData.repeat || 3,
                hideOnComplete: sc.hasOwn(item.animationData, 'hide') ?
                    item.animationData.hide : true,
            });
            x = playerSprite.x;
            y = playerSprite.y;
        }
        if(sc.hasOwn(item.animationData, 'fixedX')){
            x = item.animationData.fixedX;
        }
        if(sc.hasOwn(item.animationData, 'fixedY')){
            y = item.animationData.fixedY;
        }
        if(item.animationData.closeInventoryOnUse){
            this.gameManager.gameDom.getElement('#inventory-close').click();
        }
        this.itemSprites[animKey] = currentScene.physics.add.sprite(x, y, animKey);
        this.itemSprites[animKey].setDepth(100000);
        if(item.animationData.followPlayer){
            playerSprite.moveSprites[animKey] = this.itemSprites[animKey];
        }
        this.itemSprites[animKey].anims.play(animKey, true).on('animationcomplete', () => {
            this.destroyAnimation(item, animKey, playerSprite);
        });
    }

    extractTargetId(item, message, currentScene)
    {
        if(item.animationData.startsOnTarget && message.target?.playerId){
            return message.target.playerId;
        }
        return currentScene.player?.playerId || false;
    }

    destroyAnimation(item, animKey, playerSprite)
    {
        if(!item.animationData.destroyOnComplete){
            return;
        }
        this.itemSprites[animKey].destroy();
        delete this.itemSprites[animKey];
        if(item.animationData.followPlayer){
            delete playerSprite.moveSprites[animKey];
        }
    }
}

module.exports.InventoryReceiver = InventoryReceiver;
