/**
 *
 * Reldens - BaseObject
 *
 * Every object created will have a position.
 * Objects are just an internal platform definition, different from game items which are in a different module.
 *
 */

const { GameConst } = require('../../game/constants');

class BaseObject
{

    constructor(props)
    {
        // then we will assign all the properties from the storage automatically as part of this object.
        Object.assign(this, props);
        // we will use the client_key has the object key:
        this.key = props.client_key;
        // @TODO: - Seiyria - why is there a JSON.parse here? that seems particularly easy to mess up since JSON is a
        //   very strict syntax. why can't it just be assumed to be an object?
        // in this specific object type we will use the public params as JSON:
        this.publicParamsObj = props.public_params ? JSON.parse(props.public_params) : {};
        this.publicParamsObj.key = this.key;
        // @NOTE: we need to send the layer name for later calculate the animation depth and show the animation over the
        // proper layer.
        this.publicParamsObj.layerName = props.layer_name;
        // object position will be calculated based on the index:
        this.x = false;
        this.y = false;
        // objects metadata:
        this.metadata = {};
    }

    getPublicObjectData()
    {
        return this.publicParamsObj;
    }

    // @TODO: - Seiyria - this could just be a getter
    //   (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get)
    /*
    get animationData()
    {
        return {
            act: GameConst.OBJECT_ANIMATION,
            key: this.key,
            publicParams: this.publicParamsObj,
            data: this.metadata,
            x: this.x,
            y: this.y
        };
    }
    */
    getAnimationData()
    {
        return {
            act: GameConst.OBJECT_ANIMATION,
            key: this.key,
            publicParams: this.publicParamsObj,
            data: this.metadata,
            x: this.x,
            y: this.y
        };
    }

}

module.exports = BaseObject;
