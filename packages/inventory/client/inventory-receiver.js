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
    }

    onExecuting(message)
    {
        // @TODO - BETA.17: improve, split in several classes, methods and functionalities.
        let item = message.item;
        if(!sc.hasOwn(item, 'animationData')){
            return false;
        }
        let animKey = 'aK_'+item.key;
        let currentScene = this.gameManager.getActiveScene();
        currentScene.load.spritesheet(animKey, 'assets/custom/sprites/'+item.key+'.png', {
            frameWidth: item.animationData.frameWidth || 64,
            frameHeight: item.animationData.frameHeight || 64
        });
        currentScene.load.on('complete', () => {
            if(sc.hasOwn(this.itemSprites, animKey)){
                // sprite already running:
                return false;
            }
            let createData = {
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
            };
            let x = 0, y = 0;
            let targetId = (
                item.animationData.startsOnTarget
                && sc.hasOwn(message.target, 'playerId')
                && message.target.playerId
            ) ? message.target.playerId : currentScene.player.playerId;
            if(!targetId || !sc.hasOwn(currentScene.player.players, targetId)){
                Logger.error('Player sprite not found.');
                return false;
            }
            let playerSprite = currentScene.player.players[targetId];
            if(item.animationData.usePlayerPosition){
                currentScene.anims.create(createData);
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
            this.itemSprites[animKey].setDepth(2000000);
            if(item.animationData.followPlayer){
                playerSprite.moveSprites[animKey] = this.itemSprites[animKey];
            }
            this.itemSprites[animKey].anims.play(animKey, true).on('animationcomplete', () => {
                if(item.animationData.destroyOnComplete){
                    this.itemSprites[animKey].destroy();
                    if(item.animationData.followPlayer){
                        delete this.itemSprites[animKey];
                    }
                }
            });
        });
        currentScene.load.start();
    }

}

module.exports.InventoryReceiver = InventoryReceiver;