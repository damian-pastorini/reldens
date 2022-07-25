/**
 *
 * Reldens - PlayerEngine
 *
 * PlayerEngine is the class that handle the player actions in the client side.
 *
 */

const { PlayerEngine } = require('../../users/client/player-engine');
const { GameConst } = require('../../game/constants');

class PlayerEnginePrediction extends PlayerEngine
{

    constructor(props)
    {
        super(props);
        this.predictionBody = false;
        this.positionFromServer = false;
        let reconciliationTimeOutMs = this.gameManager.config.get('client/players/reconciliation/timeOutMs');
        this.reconciliationTimeOutMs = (false === reconciliationTimeOutMs) ? 1000 : Number(reconciliationTimeOutMs);
    }

    left()
    {
        if('pressed' === this.lastKeyState[GameConst.LEFT]){
            return;
        }
        let sendData = {dir: GameConst.LEFT};
        this.lastKeyState[GameConst.LEFT] = 'pressed';
        if(this.predictionBody){
            sendData.time = this.scene.worldPredictionTimer.currentTime;
            this.predictionBody.initMove(GameConst.LEFT, true);
        }
        this.room.send('*', sendData);
    }

    right()
    {
        if('pressed' === this.lastKeyState[GameConst.RIGHT]){
            return;
        }
        this.lastKeyState[GameConst.RIGHT] = 'pressed';
        let sendData = {dir: GameConst.RIGHT};
        if(this.predictionBody){
            sendData.time = this.scene.worldPredictionTimer.currentTime;
            this.predictionBody.initMove(GameConst.RIGHT, true);
        }
        this.room.send('*', sendData);
    }

    up()
    {
        if('pressed' === this.lastKeyState[GameConst.UP]){
            return;
        }
        this.lastKeyState[GameConst.UP] = 'pressed';
        let sendData = {dir: GameConst.UP};
        if(this.predictionBody){
            sendData.time = this.scene.worldPredictionTimer.currentTime;
            this.predictionBody.initMove(GameConst.UP, true);
        }
        this.room.send('*', sendData);
    }

    down()
    {
        if('pressed' === this.lastKeyState[GameConst.DOWN]){
            return;
        }
        this.lastKeyState[GameConst.DOWN] = 'pressed';
        let sendData = {dir: GameConst.DOWN};
        if(this.predictionBody){
            sendData.time = this.scene.worldPredictionTimer.currentTime;
            this.predictionBody.initMove(GameConst.DOWN, true);
        }
        this.room.send('*', sendData);
    }

    stop()
    {
        this.lastKeyState[GameConst.LEFT] = '';
        this.lastKeyState[GameConst.RIGHT] = '';
        this.lastKeyState[GameConst.UP] = '';
        this.lastKeyState[GameConst.DOWN] = '';
        let sendData = {act: GameConst.STOP};
        if(this.predictionBody){
            sendData.time = this.scene.worldPredictionTimer.currentTime;
            this.reconcilePosition();
        }
        this.room.send('*', sendData);
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

    reconciliationByTimeOutMs()
    {
        let callbackResult = this.reconciliationTimeOutCallBack();
        return Number(false !== callbackResult ? callbackResult : this.reconciliationTimeOutMs);
    }

    moveToPointer(pointer)
    {
        this.lastKeyState[GameConst.LEFT] = '';
        this.lastKeyState[GameConst.RIGHT] = '';
        this.lastKeyState[GameConst.UP] = '';
        this.lastKeyState[GameConst.DOWN] = '';
        let data = {
            act: GameConst.POINTER,
            column: pointer.worldColumn,
            row: pointer.worldRow,
            x: pointer.worldX - this.leftOff,
            y: pointer.worldY - this.topOff
        };
        if(this.predictionBody && this.pointsValidator){
            this.predictionBody.reconcilePosition();
            let predictionData = Object.assign({}, data);
            predictionData = this.pointsValidator.makeValidPoints(predictionData);
            this.predictionBody.moveToPoint(predictionData);
        }
        this.room.send('*', data);
    }
}

module.exports.PlayerEnginePrediction = PlayerEnginePrediction;
