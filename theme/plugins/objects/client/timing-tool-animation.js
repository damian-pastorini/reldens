/**
 *
 * Reldens - Theme - TimingToolAnimation
 *
 * Shows a tool sprite (a fishing rod or a pickaxe) next to the current player while a timing object runs, swinging it
 * towards the object until the timing is cancelled or completed.
 * The tool is a separate sprite drawn over the player, so it works with every class path sprite.
 * The tool textures are shared by every scene, so each tool texture is generated once.
 *
 */

class TimingToolAnimation
{

    /**
     * @param {Object} toolConfig
     */
    constructor(toolConfig)
    {
        this.textureKeyPrefix = 'timing-tool-';
        this.tools = {
            fishingRod: 'fishing-rod',
            pickaxe: 'pickaxe'
        };
        this.defaults = {
            toolType: this.tools.pickaxe,
            textureSize: 24,
            handleWidth: 2,
            headWidth: 3,
            lineWidth: 1,
            handleColor: 0x8b5a2b,
            headColor: 0xb8c4cc,
            lineColor: 0xe8e8e8,
            offsetX: 6,
            offsetY: 6,
            swingAngle: 30,
            swingDuration: 250
        };
        this.config = Object.assign({}, this.defaults, toolConfig);
        this.toolSprite = null;
        this.swingTween = null;
    }

    /**
     * @param {Object} message
     * @param {string} objectKey
     * @param {Object} objectSprite
     * @param {Object} gameManager
     * @returns {boolean}
     */
    handleTimingMessage(message, objectKey, objectSprite, gameManager)
    {
        if(!message){
            return false;
        }
        if(message.key !== objectKey){
            return false;
        }
        if('timingStart' === message.act){
            return this.start(objectSprite, gameManager);
        }
        if('timingCancel' === message.act || 'timingComplete' === message.act){
            this.stop();
        }
        return true;
    }

    /**
     * @param {Object} objectSprite
     * @param {Object} gameManager
     * @returns {boolean}
     */
    start(objectSprite, gameManager)
    {
        this.stop();
        let playerSprite = gameManager.getCurrentPlayerAnimation();
        if(!playerSprite?.scene){
            return false;
        }
        let scene = playerSprite.scene;
        let textureKey = this.textureKeyPrefix+this.config.toolType;
        if(!scene.textures.exists(textureKey)){
            this.generateTexture(scene, textureKey);
        }
        let facesLeft = Boolean(objectSprite) && objectSprite.x < playerSprite.x;
        let direction = facesLeft ? -1 : 1;
        this.toolSprite = scene.add.sprite(
            playerSprite.x + direction * this.config.offsetX,
            playerSprite.y + this.config.offsetY,
            textureKey
        );
        this.toolSprite.setOrigin(facesLeft ? 1 : 0, 1);
        this.toolSprite.setFlipX(facesLeft);
        this.toolSprite.setDepth(playerSprite.depth + 1);
        this.swingTween = scene.tweens.add({
            targets: this.toolSprite,
            angle: {from: 0, to: direction * this.config.swingAngle},
            duration: this.config.swingDuration,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });
        return true;
    }

    stop()
    {
        if(this.swingTween){
            this.swingTween.stop();
            this.swingTween = null;
        }
        if(this.toolSprite){
            this.toolSprite.destroy();
            this.toolSprite = null;
        }
    }

    /**
     * @param {Object} scene
     * @param {string} textureKey
     */
    generateTexture(scene, textureKey)
    {
        let size = this.config.textureSize;
        let tipX = size - 6, tipY = 4;
        let graphics = scene.add.graphics();
        graphics.lineStyle(this.config.handleWidth, this.config.handleColor, 1);
        graphics.lineBetween(1, size - 1, tipX, tipY);
        if(this.tools.fishingRod === this.config.toolType){
            graphics.lineStyle(this.config.lineWidth, this.config.lineColor, 1);
            graphics.lineBetween(tipX, tipY, size - 2, size - 4);
        }
        if(this.tools.pickaxe === this.config.toolType){
            graphics.lineStyle(this.config.headWidth, this.config.headColor, 1);
            graphics.lineBetween(tipX - 7, 1, size - 1, tipY + 5);
        }
        graphics.generateTexture(textureKey, size, size);
        graphics.destroy();
    }

}

module.exports.TimingToolAnimation = TimingToolAnimation;
