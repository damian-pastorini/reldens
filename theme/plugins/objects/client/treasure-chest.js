/**
 *
 * Reldens - TreasureChestClient
 *
 */

const { AnimationEngine } = require('reldens/lib/objects/client/animation-engine');
const { ObjectsConst } = require('reldens/lib/objects/constants');
const { GameConst } = require('reldens/lib/game/constants');

class TreasureChestClient extends AnimationEngine
{

    constructor(gameManager, props, currentPreloader)
    {
        super(gameManager, props, currentPreloader);
        this.isOpen = false;
        this.isLooted = false;
        this.pendingOpen = false;
        this.highlightColor = '0xffd700';
        let chestListenerKey = 'chestInitUi.'+this.id;
        this.gameManager.events.offWithKey(chestListenerKey);
        this.gameManager.events.onWithKey('reldens.initUiAfter', (message) => {
            if(Number(message.id) !== Number(this.id)){
                return;
            }
            this.pendingOpen = false;
            if(!message.opened){
                return;
            }
            this.isLooted = true;
            this.isOpen = true;
            this.playOpenAnimation();
        }, chestListenerKey);
    }

    enableInteraction(currentScene)
    {
        if(!this.isInteractive){
            return;
        }
        this.sceneSprite.setInteractive({useHandCursor: true}).on('pointerdown', (e) => {
            if(GameConst.SELECTORS.CANVAS !== e.downElement.nodeName){
                return;
            }
            if(this.pendingOpen){
                return;
            }
            if(this.isLooted){
                this.toggleChestAnimation();
                return;
            }
            this.pendingOpen = true;
            let tempId = (this.key === this.asset_key) ? this.id : this.key;
            this.gameManager.activeRoomEvents.send({act: ObjectsConst.OBJECT_INTERACTION, id: tempId, type: this.type});
        });
        if(this.highlightOnOver){
            this.sceneSprite.on('pointerover', () => {
                this.sceneSprite.setTint(this.highlightColor);
            });
            this.sceneSprite.on('pointerout', () => {
                this.sceneSprite.clearTint();
            });
        }
    }

    playOpenAnimation()
    {
        if(!this.sceneSprite){
            return;
        }
        this.sceneSprite.anims.play('chest_forest_1_open', true);
    }

    toggleChestAnimation()
    {
        if(!this.sceneSprite){
            return;
        }
        if(this.isOpen){
            this.sceneSprite.anims.playReverse('chest_forest_1_open');
            this.isOpen = false;
            return;
        }
        this.sceneSprite.anims.play('chest_forest_1_open', true);
        this.isOpen = true;
    }

}

module.exports.TreasureChestClient = TreasureChestClient;
