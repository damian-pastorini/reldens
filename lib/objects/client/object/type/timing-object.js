/**
 *
 * Reldens - TimingObject
 *
 * A timing object click is sent once until the server answers it: the timing start, cancel or complete, the busy
 * answer of an object in use (or of a player already using another one) and the close UI answer of an out of reach
 * click let the player click it again. A locked timing start (the player can not move until it ends) shows the cancel
 * button over the object and listens to the Esc key (not while writing in an input), both send the timing cancel
 * request; the timing cancel or complete removes them.
 *
 */

const { AnimationEngine } = require('../../animation-engine');
const { ObjectsConst } = require('../../../constants');
const { GameConst } = require('../../../../game/constants');
const { Logger, sc } = require('@reldens/utils');

class TimingObject extends AnimationEngine
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
        this.cancelButton = null;
        this.cancelButtonText = sc.get(props, 'cancelButtonText', 'X');
        this.cancelButtonOffsetY = sc.get(props, 'cancelButtonOffsetY', 2);
        this.cancelButtonDepth = sc.get(props, 'cancelButtonDepth', 9999);
        this.cancelButtonStyle = sc.get(props, 'cancelButtonStyle', {
            fontFamily: 'sans-serif',
            fontSize: '14px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        });
        this.gameManager.activeRoomEvents.room.onMessage('*', (message) => this.onTimingMessage(message));
    }

    onTimingMessage(message)
    {
        if(!message){
            return;
        }
        if(GameConst.CLOSE_UI_ACTION === message.act && Number(message.id) === Number(this.id)){
            this.pendingAction = false;
            return;
        }
        if(message.key !== this.key){
            return;
        }
        if('timingStart' === message.act){
            this.pendingAction = false;
            this.startProgressBar(this.clientParams.timingDuration);
            if(message.locked){
                this.showCancelButton();
            }
            return;
        }
        if('timingBusy' === message.act){
            this.pendingAction = false;
            return;
        }
        if('timingCancel' === message.act || 'timingComplete' === message.act){
            this.pendingAction = false;
            this.stopProgressBar();
            this.hideCancelButton();
        }
    }

    /**
     * @returns {string|number}
     */
    interactionId()
    {
        return (this.key === this.asset_key) ? this.id : this.key;
    }

    showCancelButton()
    {
        this.hideCancelButton();
        this.cancelButton = this.currentPreloader.add.text(
            this.sceneSprite.x,
            this.sceneSprite.y - this.sceneSprite.height / 2 - this.cancelButtonOffsetY,
            this.cancelButtonText,
            this.cancelButtonStyle
        );
        this.cancelButton.setOrigin(0.5, 1);
        this.cancelButton.setDepth(this.cancelButtonDepth);
        this.cancelButton.setInteractive({useHandCursor: true}).on('pointerdown', () => this.sendCancelRequest());
        this.currentPreloader.input.keyboard.on('keydown-ESC', this.cancelOnEscape, this);
    }

    hideCancelButton()
    {
        this.currentPreloader.input.keyboard.off('keydown-ESC', this.cancelOnEscape, this);
        if(!this.cancelButton){
            return;
        }
        this.cancelButton.destroy();
        this.cancelButton = null;
    }

    cancelOnEscape()
    {
        if(this.gameManager.gameDom.insideInput()){
            return;
        }
        this.sendCancelRequest();
    }

    sendCancelRequest()
    {
        this.gameManager.activeRoomEvents.send({act: ObjectsConst.TIMING_CANCEL_REQUEST, id: this.interactionId()});
    }

    enableInteraction()
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
                id: this.interactionId(),
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
            Logger.error('TimingObject - renderProgressBar - timingBar not found.', {key: this.key, id: this.id});
            return;
        }
        if(!this.sceneSprite){
            Logger.error('TimingObject - renderProgressBar - sceneSprite not found.', {key: this.key, id: this.id});
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

module.exports.TimingObject = TimingObject;
