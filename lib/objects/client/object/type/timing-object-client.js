/**
 *
 * Reldens - TimingObjectClient
 *
 */

const { AnimationEngine } = require('../../animation-engine');
const { ObjectsConst } = require('../../../constants');
const { GameConst } = require('../../../../game/constants');
const { sc } = require('@reldens/utils');

class TimingObjectClient extends AnimationEngine
{

    constructor(gameManager, props, currentPreloader)
    {
        super(gameManager, props, currentPreloader);
        this.clientParams = props;
        this.pendingAction = false;
        this.timingBar = null;
        this.timingBarInterval = null;
        this.progressBarWidth = sc.get(props, 'progressBarWidth', 32);
        this.progressBarHeight = sc.get(props, 'progressBarHeight', 4);
        this.progressBarOffsetY = sc.get(props, 'progressBarOffsetY', 8);
        this.progressBarBgColor = sc.get(this.clientParams, 'progressBarBgColor', 0x333333);
        this.progressBarFillColor = sc.get(this.clientParams, 'progressBarFillColor', 0x4488ff);
        this.gameManager.activeRoomEvents.room.onMessage('*', (message) => this.onTimingMessage(message));
    }

    onTimingMessage(message)
    {
        if(!message){
            return;
        }
        if(Number(message.id) !== Number(this.id)){
            return;
        }
        if('timingStart' === message.act){
            this.pendingAction = false;
            this.startProgressBar(this.clientParams.timingDuration);
            return;
        }
        if('timingCancel' === message.act || 'timingComplete' === message.act){
            this.pendingAction = false;
            this.stopProgressBar();
        }
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
            if(this.pendingAction){
                return;
            }
            this.pendingAction = true;
            this.gameManager.activeRoomEvents.send({
                act: ObjectsConst.OBJECT_INTERACTION,
                id: (this.key === this.asset_key) ? this.id : this.key,
                type: this.type
            });
        });
    }

    startProgressBar(duration)
    {
        this.stopProgressBar();
        this.timingBar = this.currentPreloader.add.graphics();
        this.timingBar.setDepth(9999);
        let elapsed = 0;
        let barTickMs = 50;
        this.timingBarInterval = setInterval(() => {
            elapsed += barTickMs;
            let remaining = 1 - (elapsed / duration);
            if(0 >= remaining){
                this.stopProgressBar();
                return;
            }
            this.renderProgressBar(remaining);
        }, barTickMs);
    }

    renderProgressBar(remaining)
    {
        if(!this.timingBar){
            return;
        }
        if(!this.sceneSprite){
            return;
        }
        let barX = this.sceneSprite.x - this.progressBarWidth / 2;
        let barY = this.sceneSprite.y + this.progressBarOffsetY;
        this.timingBar.clear();
        this.timingBar.fillStyle(this.progressBarBgColor, 1);
        this.timingBar.fillRect(barX, barY, this.progressBarWidth, this.progressBarHeight);
        this.timingBar.fillStyle(this.progressBarFillColor, 1);
        this.timingBar.fillRect(barX, barY, Math.floor(this.progressBarWidth * remaining), this.progressBarHeight);
    }

    stopProgressBar()
    {
        clearInterval(this.timingBarInterval);
        this.timingBarInterval = null;
        if(!this.timingBar){
            return;
        }
        this.timingBar.destroy();
        this.timingBar = null;
    }

}

module.exports.TimingObjectClient = TimingObjectClient;
