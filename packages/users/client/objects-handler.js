/**
 *
 * Reldens - ObjectsHandler
 *
 */

const { ActionsConst } = require('../../actions/constants');
const { GameConst } = require('../../game/constants');

class ObjectsHandler
{

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

    static isValidMessage(message, lifeBarUi)
    {
        return ActionsConst.DATA_TYPE_VALUE_OBJECT === message[ActionsConst.DATA_OWNER_TYPE]
            && lifeBarUi.barConfig.showEnemies;
    }

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

    static isValidToDraw(object, key, lifeBarUi)
    {
        if(!object){
            return false;
        }
        if(object.inState === GameConst.STATUS.DEATH){
            return false;
        }
        return !(lifeBarUi.barConfig.showOnClick && key !== lifeBarUi.getCurrentTargetId());
    }

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

    static drawObjectLifeBar(object, objectKey, totalValue, newValue, lifeBarUi)
    {
        lifeBarUi.destroyByKey(objectKey);
        if(!this.isValidToDraw(object, objectKey, lifeBarUi)){
            return false;
        }
        this.drawLifeBarInPosition(lifeBarUi, objectKey, object, totalValue, newValue);
    }

    static drawLifeBarInPosition(lifeBarUi, key, object, totalValue, newValue)
    {
        lifeBarUi.lifeBars[key] = lifeBarUi.gameManager.getActiveScene().add.graphics();
        let {x, y} = this.calculateObjectLifeBarPosition(object, lifeBarUi);
        lifeBarUi.drawBar(lifeBarUi.lifeBars[key], totalValue, newValue, x, y);
    }

   static calculateObjectLifeBarPosition(object, lifeBarUi)
    {
        return {
            x: object.x - (object.sceneSprite.width / 2),
            y: object.y - (object.sceneSprite.height / 2) - lifeBarUi.barConfig.height - lifeBarUi.barConfig.top
        };
    }

}

module.exports.ObjectsHandler = ObjectsHandler;