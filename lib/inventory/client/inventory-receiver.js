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
        currentScene.load.spritesheet(animKey, '/assets/custom/sprites/'+item.key+'.png', {
            frameWidth: item.animationData.frameWidth || 64,
            frameHeight: item.animationData.frameHeight || 64
        });
        currentScene.load.on('complete', () => {
            this.createItemSprites(animKey, item, message, currentScene);
        });
        currentScene.load.start();
    }

    createItemSprites(animKey, item, message, currentScene)
    {
        if(this.itemSprites[animKey] && sc.hasOwn(this.itemSprites, animKey)){
            if(!item.animationData.destroyOnComplete){
                this.itemSprites[animKey].anims.play(animKey, false);
                return;
            }
            Logger.info('Sprite already running for item: '+animKey);
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
        // @TODO - BETA - Make all the defaults configurable.
        currentScene.anims.create({
            key: animKey,
            frames: currentScene.anims.generateFrameNumbers(animKey, {
                start: item.animationData.start || 0,
                end: item.animationData.end || 1
            }),
            frameRate: sc.get(item.animationData, 'rate', currentScene.configuredFrameRate),
            repeat: item.animationData.repeat || 3,
            hideOnComplete: sc.get(item.animationData, 'hide', true),
        });
        if(item.animationData.closeInventoryOnUse){
            this.gameManager.gameDom.getElement('#inventory-close').click();
        }
        let x = sc.get(item.animationData, 'fixedX', (item.animationData.usePlayerPosition ? playerSprite.x : 0));
        let y = sc.get(item.animationData, 'fixedY', (item.animationData.usePlayerPosition ? playerSprite.y : 0));
        this.itemSprites[animKey] = currentScene.physics.add.sprite(x, y, animKey);
        this.itemSprites[animKey].setDepth(1000000);
        if(item.animationData.followPlayer){
            playerSprite.moveSprites[animKey] = this.itemSprites[animKey];
        }
        // @TODO - BETA - Make auto-destroy configurable.
        this.itemSprites[animKey].anims.play(animKey, false).on('animationcomplete', () => {
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
