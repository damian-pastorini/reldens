/**
 *
 * Reldens - LifebarUi
 *
 */

const { UsersConst } = require('../constants');
const { ActionsConst } = require('../../actions/constants');
const { GameConst } = require('../../game/constants');
const { ObjectsConst } = require('../../objects/constants');
const { sc } = require('@reldens/utils');

class LifebarUi
{

    constructor(props)
    {
        this.events = props.events;
    }

    setup(gameManager)
    {
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
        this.events.on('reldens.playerStatsUpdateAfter', (message, roomEvents) => {
            this.onPlayerStatsUpdateAfter(message, roomEvents);
        });
        // eslint-disable-next-line no-unused-vars
        this.events.on('reldens.joinedRoom', (room, gameManager) => {
            this.listenMessages(room);
        });
        // eslint-disable-next-line no-unused-vars
        this.events.on('reldens.runPlayerAnimation', (playerEngine, playerId, player) => {
            this.drawLifeBar(playerId);
        });
        // eslint-disable-next-line no-unused-vars
        this.events.on('reldens.updateGameSizeBefore', (gameEngine, newWidth, newHeight) => {
            if(!this.barConfig.fixedPosition){
                return false;
            }
            this.setFixedPosition(newWidth, newHeight);
            this.drawLifeBar(this.gameManager.getCurrentPlayer().playerId);
        });
        // eslint-disable-next-line no-unused-vars
        this.events.on('reldens.playersOnRemove', (player, key, roomEvents) => {
            this.removeLifeBar(key);
        });
        // eslint-disable-next-line no-unused-vars
        this.events.on('reldens.playersOnAddReady', (player, key, previousScene, roomEvents) => {
            this.processLifeBarQueue();
        });
        // eslint-disable-next-line no-unused-vars
        this.events.on('reldens.playerEngineAddPlayer', (playerEngine, addedPlayerId, addedPlayerData) => {
            this.processLifeBarQueue();
        });
        this.events.on('reldens.objectBodyChanged', (event) => {
            return this.generateObjectLifeBar(event.key);
        });
        // eslint-disable-next-line no-unused-vars
        this.events.on('reldens.gameEngineShowTarget', (gameEngine, target, previousTarget) => {
            this.showTargetLifeBar(target, previousTarget);
        });
        // eslint-disable-next-line no-unused-vars
        this.events.on('reldens.gameEngineClearTarget', (gameEngine, previousTarget) => {
            this.clearPreviousBar(previousTarget);
        });
        return this;
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
            this.generateObjectLifeBar(target.id);
        }
        if(target.type === GameConst.TYPE_PLAYER){
            this.drawLifeBar(target.id);
        }
    }

    generateObjectLifeBar(key)
    {
        if(sc.hasOwn(this.lifeBars, key)){
            this.lifeBars[key].destroy();
        }
        let currentObject = sc.get(this.gameManager.getActiveScene().objectsAnimations, key, false);
        if(!sc.hasOwn(currentObject, this.barProperty+'Total')){
            return false;
        }
        if(!currentObject){
            return false;
        }
        if(this.barConfig.showOnClick && key !== this.getCurrentTargetId()){
            return false;
        }
        this.lifeBars[key] = this.gameManager.getActiveScene().add.graphics();
        let {x, y} = this.calculateObjectLifeBarPosition(currentObject);
        this.drawBar(
            this.lifeBars[key],
            currentObject[this.barProperty + 'Total'],
            currentObject[this.barProperty + 'Value'],
            x,
            y
        );
    }

    calculateObjectLifeBarPosition(currentObject)
    {
        return {
            x: currentObject.x - (currentObject.sceneSprite.width / 2),
            y: currentObject.y - (currentObject.sceneSprite.height / 2) - this.barConfig.height - this.barConfig.top
        };
    }

    setFixedPosition(newWidth, newHeight)
    {
        if(!newWidth || !newHeight){
            let position = this.gameManager.gameEngine.getCurrentScreenSize(this.gameManager);
            newWidth = position.newWidth;
            newHeight = position.newHeight;
        }
        let {uiX, uiY} = this.gameManager.gameEngine.uiScene.getUiConfig('lifeBar', newWidth, newHeight);
        this.fixedPositionX = uiX;
        this.fixedPositionY = uiY;
    }

    onPlayerStatsUpdateAfter(message, roomEvents)
    {
        let currentPlayer = roomEvents.gameManager.getCurrentPlayer();
        this.updatePlayerBarData(
            currentPlayer.playerId,
            message.statsBase[this.barProperty],
            message.stats[this.barProperty]
        );
        this.drawLifeBar(currentPlayer.playerId);
    }

    listenMessages(room)
    {
        room.onMessage((message) => {
            if(message.act === UsersConst.ACTION_LIFEBAR_UPDATE){
                if(
                    message[ActionsConst.DATA_OWNER_TYPE] === ActionsConst.DATA_TYPE_VALUE_OBJECT
                    && this.barConfig.showEnemies
                ){
                    this.processObjectLifeBarMessage(message, true);
                }
                if(message[ActionsConst.DATA_OWNER_TYPE] === ActionsConst.DATA_TYPE_VALUE_PLAYER){
                    this.processPlayerLifeBarMessage(message, true);
                }
            }
            if(message.act === ActionsConst.BATTLE_ENDED){
                if(sc.hasOwn(this.lifeBars, message.t)){
                    this.lifeBars[message.t].destroy();
                }
            }
        });
    }

    canShow(playerId)
    {
        return this.barConfig.showAllPlayers
            || playerId === this.gameManager.getCurrentPlayer().playerId
            || (this.barConfig.showOnClick && playerId === this.getCurrentTargetId());
    }

    processObjectLifeBarMessage(message, queue = false)
    {
        let currentObject = sc.get(
            this.gameManager.getActiveScene().objectsAnimations,
            message[ActionsConst.DATA_OWNER_KEY],
            false
        );
        if(!currentObject || currentObject.isDead){
            if(queue){
                this.queueLifeBarMessage(message);
            }
            return false;
        }
        currentObject[this.barProperty+'Total'] = message.totalValue;
        currentObject[this.barProperty+'Value'] = message.newValue;
        this.drawObjectLifeBar(currentObject, message);
    }

    queueLifeBarMessage(message)
    {
        if(!sc.hasOwn(this.gameManager, 'lifeBarQueue')){
            this.gameManager.lifeBarQueue = [];
        }
        this.gameManager.lifeBarQueue.push(message);
    }

    drawObjectLifeBar(currentObject, message)
    {
        let objectKey = message[ActionsConst.DATA_OWNER_KEY];
        if(sc.hasOwn(this.lifeBars, objectKey)){
            this.lifeBars[objectKey].destroy();
        }
        if(currentObject.inState === GameConst.STATUS.DEATH){
            return false;
        }
        if(this.barConfig.showOnClick && message[ActionsConst.DATA_OWNER_KEY] !== this.getCurrentTargetId()){
            return false;
        }
        this.lifeBars[objectKey] = this.gameManager.getActiveScene().add.graphics();
        let {x, y} = this.calculateObjectLifeBarPosition(currentObject);
        this.drawBar(
            this.lifeBars[objectKey],
            message.totalValue,
            message.newValue,
            x,
            y
        );
    }

    processPlayerLifeBarMessage(message, queue = false)
    {
        let currentPlayer = this.gameManager.getCurrentPlayer();
        let messageOwnerKey = message[ActionsConst.DATA_OWNER_KEY];
        if(!currentPlayer || !currentPlayer.players || !currentPlayer.players[messageOwnerKey]){
            if(queue){
                this.queueLifeBarMessage(message);
            }
            return false;
        }
        let messageOwnerType = message[ActionsConst.DATA_OWNER_TYPE];
        if(messageOwnerType === ActionsConst.DATA_TYPE_VALUE_OBJECT && this.barConfig.showEnemies){
            this.processObjectLifeBarMessage(message);
        }
        if(messageOwnerType === ActionsConst.DATA_TYPE_VALUE_PLAYER){
            this.updatePlayerBarData(messageOwnerKey, message.totalValue, message.newValue);
            if(this.canShow(messageOwnerKey)){
                this.drawLifeBar(messageOwnerKey);
            }
        }
    }

    updatePlayerBarData(playerId, total, newValue)
    {
        let currentPlayer = this.gameManager.getCurrentPlayer();
        currentPlayer.players[playerId][this.barProperty+'Total'] = total;
        currentPlayer.players[playerId][this.barProperty+'Value'] = newValue;
    }

    processLifeBarQueue()
    {
        if(!this.gameManager.lifeBarQueue.length){
            return false;
        }
        for(let message of this.gameManager.lifeBarQueue){
            // process queue messages:
            let messageOwnerType = message[ActionsConst.DATA_OWNER_TYPE];
            if(messageOwnerType === ActionsConst.DATA_TYPE_VALUE_OBJECT && this.barConfig.showEnemies){
                this.processObjectLifeBarMessage(message);
            }
            if(messageOwnerType === ActionsConst.DATA_TYPE_VALUE_PLAYER){
                this.processPlayerLifeBarMessage(message);
            }
        }
    }

    drawLifeBar(playerId)
    {
        if(sc.hasOwn(this.lifeBars, playerId)){
            this.lifeBars[playerId].destroy();
        }
        if(!this.canShow(playerId)){
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
                this.setFixedPosition();
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

    prepareBarData(playerId)
    {
        let player = this.gameManager.getCurrentPlayer().players[playerId];
        let fullValue = player[this.barProperty+'Total'];
        let filledValue = player[this.barProperty+'Value'];
        let ownerTop = sc.get(player, 'topOff', 0) - this.playerSize.height;
        return {player, fullValue, filledValue, ownerTop};
    }

    removeLifeBar(playerId)
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

}

module.exports.LifebarUi = LifebarUi;
