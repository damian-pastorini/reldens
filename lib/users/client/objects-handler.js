/**
 *
 * Reldens - ObjectsHandler
 *
 * Handles object life bar rendering and updates for NPCs and enemies.
 *
 */

const { ActionsConst } = require('../../actions/constants');
const { GameConst } = require('../../game/constants');

class ObjectsHandler
{

    /**
     * @param {Object} message
     * @param {boolean} [queue]
     * @param {Object} lifeBarUi
     * @returns {boolean}
     */
    static processObjectLifeBarMessage(message, queue = false, lifeBarUi)
    {
        if(!this.isValidMessage(message, lifeBarUi)){
            return false;
        }
        let objectKey = message[ActionsConst.DATA_OWNER_KEY];
        let barData = {};
        barData[lifeBarUi.barPropertyTotal()] = message.totalValue;
        barData[lifeBarUi.barPropertyValue()] = message.newValue;
        lifeBarUi.lifeDataByKey[objectKey] = barData;
        let object = lifeBarUi.getObjectByKey(objectKey);
        if(!object){
            if(queue){
                lifeBarUi.queueLifeBarMessage(message);
            }
            return false;
        }
        this.drawObjectLifeBar(
            object,
            message[ActionsConst.DATA_OWNER_KEY],
            message.totalValue,
            message.newValue,
            lifeBarUi
        );
        return true;
    }

    /**
     * @param {Object} message
     * @param {Object} lifeBarUi
     * @returns {boolean}
     */
    static isValidMessage(message, lifeBarUi)
    {
        return ActionsConst.DATA_TYPE_VALUE_OBJECT === message[ActionsConst.DATA_OWNER_TYPE]
            && lifeBarUi.barConfig.showEnemies;
    }

    /**
     * @param {Object} lifeBarUi
     * @returns {void}
     */
    static drawObjectsLifeBar(lifeBarUi)
    {
        for(let objectKey of Object.keys(lifeBarUi.lifeDataByKey)){
            let object = lifeBarUi.getObjectByKey(objectKey);
            this.drawObjectLifeBar(
                object,
                objectKey,
                lifeBarUi.lifeDataByKey[objectKey][lifeBarUi.barPropertyTotal()],
                lifeBarUi.lifeDataByKey[objectKey][lifeBarUi.barPropertyValue()],
                lifeBarUi
            );
        }
    }

    /**
     * @param {Object} object
     * @param {string} key
     * @param {Object} lifeBarUi
     * @returns {boolean}
     */
    static isValidToDraw(object, key, lifeBarUi)
    {
        if(!object){
            return false;
        }
        if(GameConst.STATUS.DEATH === object.inState || GameConst.STATUS.DISABLED === object.inState){
            return false;
        }
        return !(lifeBarUi.barConfig.showOnClick && key !== lifeBarUi.getCurrentTargetId());
    }

    /**
     * @param {string} objectKey
     * @param {Object} lifeBarUi
     * @returns {boolean|void}
     */
    static generateObjectLifeBar(objectKey, lifeBarUi)
    {
        let lifeBarData = lifeBarUi.lifeDataByKey[objectKey];
        if(!lifeBarData){
            return false;
        }
        let object = lifeBarUi.getObjectByKey(objectKey);
        this.drawObjectLifeBar(
            object,
            objectKey,
            lifeBarData[lifeBarUi.barPropertyTotal()],
            lifeBarData[lifeBarUi.barPropertyValue()],
            lifeBarUi
        );
    }

    /**
     * @param {Object} object
     * @param {string} objectKey
     * @param {number} totalValue
     * @param {number} newValue
     * @param {Object} lifeBarUi
     * @returns {boolean|void}
     */
    static drawObjectLifeBar(object, objectKey, totalValue, newValue, lifeBarUi)
    {
        lifeBarUi.destroyByKey(objectKey);
        if(!this.isValidToDraw(object, objectKey, lifeBarUi)){
            return false;
        }
        this.drawLifeBarInPosition(lifeBarUi, objectKey, object, totalValue, newValue);
    }

    /**
     * @param {Object} lifeBarUi
     * @param {string} key
     * @param {Object} object
     * @param {number} totalValue
     * @param {number} newValue
     * @returns {void}
     */
    static drawLifeBarInPosition(lifeBarUi, key, object, totalValue, newValue)
    {
        lifeBarUi.lifeBars[key] = lifeBarUi.gameManager.getActiveScene().add.graphics();
        let {x, y} = this.calculateObjectLifeBarPosition(object, lifeBarUi);
        lifeBarUi.drawBar(lifeBarUi.lifeBars[key], totalValue, newValue, x, y);
    }

    /**
     * @param {Object} object
     * @param {Object} lifeBarUi
     * @returns {Object}
     */
   static calculateObjectLifeBarPosition(object, lifeBarUi)
    {
        return {
            x: object.x - (object.sceneSprite.width / 2),
            y: object.y - (object.sceneSprite.height / 2) - lifeBarUi.barConfig.height - lifeBarUi.barConfig.top
        };
    }

}

module.exports.ObjectsHandler = ObjectsHandler;