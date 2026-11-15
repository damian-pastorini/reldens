/**
 *
 * Reldens - PlayerEnginePrediction
 *
 * Extends PlayerEngine with client-side movement prediction and server reconciliation.
 * Predicts player position locally before receiving server confirmation, then reconciles
 * any discrepancies. Reduces perceived input lag by immediately showing movement locally
 * while waiting for authoritative server updates.
 *
 */

const { PlayerEngine } = require('../../users/client/player-engine');
const { GameConst } = require('../../game/constants');

/**
 * @typedef {import('../../users/client/player-engine').PlayerEngine} PlayerEngine
 */
class PlayerEnginePrediction extends PlayerEngine
{

    /**
     * @param {Object} props
     */
    constructor(props)
    {
        super(props);
        /** @type {Object|boolean} */
        this.predictionBody = false;
        /** @type {Object|boolean} */
        this.positionFromServer = false;
        let reconciliationTimeOutMs = this.gameManager.config.get('client/players/reconciliation/timeOutMs');
        /** @type {number} */
        this.reconciliationTimeOutMs = (false === reconciliationTimeOutMs) ? 1000 : Number(reconciliationTimeOutMs);
    }

    left()
    {
        if(this.lastKeyState[GameConst.LEFT]){
            return;
        }
        let sendData = {dir: GameConst.LEFT};
        this.lastKeyState[GameConst.LEFT] = GameConst.KEY_STATES.PRESSED;
        if(this.predictionBody){
            sendData.time = this.scene.worldPredictionTimer.currentTime;
            this.predictionBody.initMove(GameConst.LEFT, true);
        }
        this.roomEvents.send(sendData);
    }

    right()
    {
        if(this.lastKeyState[GameConst.RIGHT]){
            return;
        }
        this.lastKeyState[GameConst.RIGHT] = GameConst.KEY_STATES.PRESSED;
        let sendData = {dir: GameConst.RIGHT};
        if(this.predictionBody){
            sendData.time = this.scene.worldPredictionTimer.currentTime;
            this.predictionBody.initMove(GameConst.RIGHT, true);
        }
        this.roomEvents.send(sendData);
    }

    up()
    {
        if(this.lastKeyState[GameConst.UP]){
            return;
        }
        this.lastKeyState[GameConst.UP] = GameConst.KEY_STATES.PRESSED;
        let sendData = {dir: GameConst.UP};
        if(this.predictionBody){
            sendData.time = this.scene.worldPredictionTimer.currentTime;
            this.predictionBody.initMove(GameConst.UP, true);
        }
        this.roomEvents.send(sendData);
    }

    down()
    {
        if(this.lastKeyState[GameConst.DOWN]){
            return;
        }
        this.lastKeyState[GameConst.DOWN] = GameConst.KEY_STATES.PRESSED;
        let sendData = {dir: GameConst.DOWN};
        if(this.predictionBody){
            sendData.time = this.scene.worldPredictionTimer.currentTime;
            this.predictionBody.initMove(GameConst.DOWN, true);
        }
        this.roomEvents.send(sendData);
    }

    stop()
    {
        this.resetKeyStates();
        let sendData = {act: GameConst.STOP};
        if(this.predictionBody){
            sendData.time = this.scene.worldPredictionTimer.currentTime;
            this.reconcilePosition();
        }
        this.roomEvents.send(sendData);
    }

    reconcilePosition()
    {
        if(!this.predictionBody || !this.positionFromServer){
            return;
        }
        this.predictionBody.stopFull();
        setTimeout(() => {
            this.predictionBody.position[0] = this.positionFromServer.state.x;
            this.predictionBody.position[1] = this.positionFromServer.state.y;
            this.predictionBody.dir = this.positionFromServer.state.dir;
            this.updatePlayer(this.playerId, this.positionFromServer);
        }, this.reconciliationByTimeOutMs());
    }

    reconciliationTimeOutCallBack()
    {
        return false;
    }

    /**
     * @returns {number}
     */
    reconciliationByTimeOutMs()
    {
        let callbackResult = this.reconciliationTimeOutCallBack();
        if(false === callbackResult){
            callbackResult = this.reconciliationTimeOutMs;
        }
        return Number(callbackResult);
    }

    /**
     * @param {Object} pointer
     * @returns {boolean|void}
     */
    moveToPointer(pointer)
    {
        if(this.predictionBody && this.pointsValidator){
            this.reconcilePosition();
            this.predictionBody.moveToPoint(this.pointsValidator.makeValidPoints(this.createPointerMoveData(pointer)));
        }
        return super.moveToPointer(pointer);
    }
}

module.exports.PlayerEnginePrediction = PlayerEnginePrediction;
