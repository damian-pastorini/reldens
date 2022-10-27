/**
 *
 * Reldens - LifebarUi
 *
 */

const { UsersConst } = require('../constants');
const { ActionsConst } = require('../../actions/constants');
const { GameConst } = require('../../game/constants');
const { ObjectsConst } = require('../../objects/constants');
const { ObjectsHandler } = require('./objects-handler');
const { sc } = require('@reldens/utils');

class LifebarUi
{

    constructor(props)
    {
        this.events = props.events;
    }

    createLifeBarUi(gameManager)
    {
        // @TODO - BETA - General refactor, extract methods into different services.
        this.barConfig = gameManager.config.get('client/ui/lifeBar');
        if(!this.barConfig.enabled){
            return false;
        }
        this.gameManager = gameManager;
        this.fixedPositionX = false;
        this.fixedPositionY = false;
        this.barProperty = this.gameManager.config.get('client/actions/skills/affectedProperty');
        this.playerSize = this.gameManager.config.get('client/players/size');
        this.lifeBars = {};
        this.lifeDataByKey = {};
        this.listenEvents();
        return this;
    }

    listenEvents()
    {
        this.events.on('reldens.playerStatsUpdateAfter', (message, roomEvents) => {
            this.updatePlayerLifeBar(message, roomEvents);
        });
        // eslint-disable-next-line no-unused-vars
        this.events.on('reldens.joinedRoom', (room, gameManager) => {
            this.listenMessages(room);
        });
        // eslint-disable-next-line no-unused-vars
        this.events.on('reldens.runPlayerAnimation', (playerEngine, playerId, playerState) => {
            this.drawPlayerLifeBar(playerId);
        });
        // eslint-disable-next-line no-unused-vars
        this.events.on('reldens.updateGameSizeBefore', (gameEngine, newWidth, newHeight) => {
            this.drawOnGameResize(newWidth, newHeight);
        });
        // eslint-disable-next-line no-unused-vars
        this.events.on('reldens.playersOnRemove', (player, key, roomEvents) => {
            this.removePlayerLifeBar(key);
        });
        // eslint-disable-next-line no-unused-vars
        this.events.on('reldens.playerEngineAddPlayer', (playerEngine, addedPlayerId, addedPlayerData) => {
            this.processLifeBarQueue();
        });
        // eslint-disable-next-line no-unused-vars
        this.events.on('reldens.createAnimationAfter', (animationEngine) => {
            ObjectsHandler.drawObjectsLifeBar(this);
        });
        this.events.on('reldens.objectBodyChanged', (event) => {
            ObjectsHandler.generateObjectLifeBar(event.key, this);
        });
        // eslint-disable-next-line no-unused-vars
        this.events.on('reldens.gameEngineShowTarget', (gameEngine, target, previousTarget) => {
            this.showTargetLifeBar(target, previousTarget);
        });
        // eslint-disable-next-line no-unused-vars
        this.events.on('reldens.gameEngineClearTarget', (gameEngine, previousTarget) => {
            this.clearPreviousBar(previousTarget);
        });
    }

    drawOnGameResize(newWidth, newHeight)
    {
        if(!this.barConfig.fixedPosition){
            return false;
        }
        this.setPlayerLifeBarFixedPosition(newWidth, newHeight);
        this.drawPlayerLifeBar(this.gameManager.getCurrentPlayer().playerId);
    }

    clearPreviousBar(previousTarget)
    {
        if(
            previousTarget
            && sc.hasOwn(this.lifeBars, previousTarget.id)
            && this.gameManager.getCurrentPlayer().playerId !== previousTarget.id
        ){
            this.lifeBars[previousTarget.id].destroy();
        }
    }

    showTargetLifeBar(target, previousTarget)
    {
        if(!this.barConfig.showOnClick){
            return false;
        }
        this.clearPreviousBar(previousTarget);
        if(target.type === ObjectsConst.TYPE_OBJECT){
            ObjectsHandler.generateObjectLifeBar(target.id, this);
        }
        if(target.type === GameConst.TYPE_PLAYER){
            this.drawPlayerLifeBar(target.id);
        }
    }

    barPropertyValue()
    {
        return this.barProperty + 'Value';
    }

    barPropertyTotal()
    {
        return this.barProperty + 'Total';
    }

    setPlayerLifeBarFixedPosition(newWidth, newHeight)
    {
        if(!newWidth || !newHeight){
            let position = this.gameManager.gameEngine.getCurrentScreenSize();
            newWidth = position.newWidth;
            newHeight = position.newHeight;
        }
        let {uiX, uiY} = this.gameManager.gameEngine.uiSceneManager.getUiConfig('lifeBar', newWidth, newHeight);
        this.fixedPositionX = uiX;
        this.fixedPositionY = uiY;
    }

    updatePlayerLifeBar(message, roomEvents)
    {
        let currentPlayer = roomEvents.gameManager.getCurrentPlayer();
        this.updatePlayerBarData(
            currentPlayer.playerId,
            message.statsBase[this.barProperty],
            message.stats[this.barProperty]
        );
        this.drawPlayerLifeBar(currentPlayer.playerId);
    }

    listenMessages(room)
    {
        room.onMessage('*', (message) => {
            this.listenBattleEnd(message);
            this.listenLifeBarUpdates(message);
        });
    }

    listenBattleEnd(message)
    {
        if(message.act !== ActionsConst.BATTLE_ENDED){
            return false;
        }
        if(!sc.hasOwn(this.lifeBars, message.t)){
            return false;
        }
        this.lifeBars[message.t].destroy();
    }

    listenLifeBarUpdates(message)
    {
        if(message.act !== UsersConst.ACTION_LIFEBAR_UPDATE){
            return false;
        }
        ObjectsHandler.processObjectLifeBarMessage(message, true, this);
        this.processPlayerLifeBarMessage(message, true);
    }

    canShowPlayerLifeBar(playerId)
    {
        return this.barConfig.showAllPlayers
            || playerId === this.gameManager.getCurrentPlayer()?.playerId
            || (this.barConfig.showOnClick && playerId === this.getCurrentTargetId());
    }

    queueLifeBarMessage(message)
    {
        if(!sc.hasOwn(this.gameManager, 'lifeBarQueue')){
            this.gameManager.lifeBarQueue = [];
        }
        this.gameManager.lifeBarQueue.push(message);
    }

    processPlayerLifeBarMessage(message, queue = false)
    {
        if(ActionsConst.DATA_TYPE_VALUE_PLAYER !== message[ActionsConst.DATA_OWNER_TYPE]){
            return false;
        }
        let currentPlayer = this.gameManager.getCurrentPlayer();
        let messageOwnerKey = message[ActionsConst.DATA_OWNER_KEY];
        if(!currentPlayer || !currentPlayer.players || !currentPlayer.players[messageOwnerKey]){
            if(queue){
                this.queueLifeBarMessage(message);
            }
            return false;
        }
        this.updatePlayerBarData(messageOwnerKey, message.totalValue, message.newValue);
        if(this.canShowPlayerLifeBar(messageOwnerKey)){
            this.drawPlayerLifeBar(messageOwnerKey);
        }
        return true;
    }

    updatePlayerBarData(playerId, total, newValue)
    {
        let currentPlayer = this.gameManager.getCurrentPlayer();
        currentPlayer.players[playerId][this.barPropertyTotal()] = total;
        currentPlayer.players[playerId][this.barPropertyValue()] = newValue;
    }

    processLifeBarQueue()
    {
        if(0 === this.gameManager.lifeBarQueue.length){
            return false;
        }
        let forDelete = [];
        for(let message of this.gameManager.lifeBarQueue){
            if(ObjectsHandler.processObjectLifeBarMessage(message, false, this)){
                forDelete.push(message);
            }
            if(this.processPlayerLifeBarMessage(message, false)){
                forDelete.push(message);
            }
        }
        if(0 < forDelete.length){
            this.gameManager.lifeBarQueue = this.gameManager.lifeBarQueue.filter(item => !forDelete.includes(item));
        }
    }

    drawPlayerLifeBar(playerId)
    {
        this.destroyByKey(playerId);
        if(!this.canShowPlayerLifeBar(playerId)){
            return false;
        }
        let barData = this.prepareBarData(playerId);
        let barHeight = this.barConfig.height;
        let barTop = this.barConfig.top;
        let fullBarWidth = this.barConfig.width;
        let uiX = barData.player.x - (fullBarWidth / 2);
        let uiY = barData.player.y - barHeight - barTop + (barData.ownerTop/2);
        if(playerId === this.gameManager.getCurrentPlayer().playerId && this.barConfig.fixedPosition){
            // if the position is fixed then the bar has to go on the ui scene:
            this.lifeBars[playerId] = this.gameManager.getActiveScenePreloader().add.graphics();
            if(this.fixedPositionX === false || this.fixedPositionY === false){
                this.setPlayerLifeBarFixedPosition();
            }
            uiX = this.fixedPositionX;
            uiY = this.fixedPositionY;
        } else {
            // otherwise, the bar will be added in the current scene:
            this.lifeBars[playerId] = this.gameManager.getActiveScene().add.graphics();
        }
        this.drawBar(this.lifeBars[playerId], barData.fullValue, barData.filledValue, uiX, uiY);
        return this;
    }

    destroyByKey(barKey)
    {
        if(sc.hasOwn(this.lifeBars, barKey)){
            this.lifeBars[barKey].destroy();
        }
    }

    prepareBarData(playerId)
    {
        let player = this.gameManager.getCurrentPlayer().players[playerId];
        let fullValue = player[this.barPropertyTotal()];
        let filledValue = player[this.barPropertyValue()];
        let ownerTop = sc.get(player, 'topOff', 0) - this.playerSize.height;
        return {player, fullValue, filledValue, ownerTop};
    }

    removePlayerLifeBar(playerId)
    {
        if(!sc.hasOwn(this.lifeBars, playerId)){
            return false;
        }
        this.lifeBars[playerId].destroy();
        delete this.lifeBars[playerId];
    }

    drawBar(lifeBarGraphic, fullValue, filledValue, uiX, uiY)
    {
        let barHeight = this.barConfig.height;
        let fullBarWidth = this.barConfig.width;
        let filledBarWidth = (filledValue * fullBarWidth) / fullValue;
        lifeBarGraphic.clear();
        lifeBarGraphic.fillStyle(parseInt(this.barConfig.fillStyle), 1);
        lifeBarGraphic.fillRect(uiX, uiY, filledBarWidth, barHeight);
        lifeBarGraphic.lineStyle(1, parseInt(this.barConfig.lineStyle));
        lifeBarGraphic.strokeRect(uiX, uiY, fullBarWidth, barHeight);
        lifeBarGraphic.alpha = 0.6;
        lifeBarGraphic.setDepth(300000);
    }

    getCurrentTargetId()
    {
        return sc.get(this.gameManager.getCurrentPlayer().currentTarget, 'id', false);
    }

    getObjectByKey(objectKey)
    {
        return sc.get(this.gameManager.getActiveScene().objectsAnimations, objectKey, false);
    }

}

module.exports.LifebarUi = LifebarUi;
