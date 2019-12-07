/**
 *
 * Reldens - BaseObject
 *
 * Every object created will have a position.
 * Objects are just an internal platform definition, different from game items which are in a different module.
 *
 */

const { Logger } = require('../../game/logger');

class BaseObject
{

    // object position will be calculated based on the index:
    x = false;
    y = false;
    interactionArea = false;
    interactionLimits = {};

    constructor(props)
    {
        // then we will assign all the properties from the storage automatically as part of this object.
        Object.assign(this, props);
        // we will use the client_key has the object key:
        this.key = props.client_key;
        // in this specific object type we will use the public params as JSON, this is coming from the storage:
        try {
            this.clientParams = props.client_params ? JSON.parse(props.client_params) : {};
        } catch (err) {
            Logger.error('BaseObject, clientParams JSON error.');
        }
        this.clientParams.key = this.key;
        this.clientParams.id = this.id;
        // @NOTE: we need to send the layer name for later calculate the animation depth and show the animation over the
        // proper layer.
        this.clientParams.layerName = props.layer_name;
    }

    setupInteractionArea(margin = false)
    {
        // interaction area can be forced by parameter:
        if(margin){
            this.interactionArea = margin;
        }
        // if there's none interaction area just do nothing:
        if(!this.interactionArea){
            return;
        }
        this.interactionLimits.left = this.x - this.interactionArea;
        this.interactionLimits.right = this.x + this.interactionArea;
        this.interactionLimits.up = this.y - this.interactionArea;
        this.interactionLimits.down = this.y + this.interactionArea;
    }

    isValidInteraction(posX, posY)
    {
        return posX > this.interactionLimits.left
            && posX < this.interactionLimits.right
            && posY > this.interactionLimits.up
            && posY < this.interactionLimits.down;
    }

}

module.exports.BaseObject = BaseObject;
