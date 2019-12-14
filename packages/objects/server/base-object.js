/**
 *
 * Reldens - BaseObject
 *
 * Every object created will have a position.
 * Objects are just an internal platform definition, different from game items which are in a different module.
 *
 */

const { InteractionArea } = require('../../world/interaction-area');
const { Logger } = require('../../game/logger');

class BaseObject extends InteractionArea
{

    constructor(props)
    {
        super();
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

}

module.exports.BaseObject = BaseObject;
