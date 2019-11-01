/**
 *
 * Reldens - AnimationObject
 *
 * This is a base object class, AnimationsObject class will only send the run animation action to the client.
 *
 */

const BaseObject = require('./base-object');
const share = require('../utils/constants');

class AnimationObject extends BaseObject
{

    constructor(props)
    {
        super(props);
        // this is a hardcoded property for this specific object type:
        this.isAnimation = true;
        // we will use the client_key has key:
        this.key = props.client_key;
        // in this specific object type we will use the public params as JSON:
        this.publicParamsObj = props.public_params ? JSON.parse(props.public_params) : {};
        this.publicParamsObj.key = this.key;
        // @NOTE: we need to send the layer name for later calculate the animation depth and show the animation over the
        // proper layer.
        this.publicParamsObj.layerName = props.layer_name;
        // the actions will be false as default:
        this.runOnHit = false;
        this.runOnAction = false;
    }

    getAnimationData()
    {
        return {
            act: share.OBJECT_ANIMATION,
            key: this.key,
            publicParams: this.publicParamsObj,
            x: this.x,
            y: this.y
        };
    }

    onHit(props)
    {
        if(this.runOnHit && props.room){
            let client = props.room.getClientById(props.playerBody.playerId);
            if(!client){
                console.log('ERROR - Object hit, client not found by playerId:', props.playerBody.playerId);
            } else {
                props.room.send(client, this.getAnimationData());
            }
        }
    }

    onAction(props)
    {
        if(this.runOnAction && props.room) {
            let client = props.room.getClientById(props.playerBody.playerId);
            if(!client){
                console.log('ERROR - Object action, client not found by playerId:', props.playerBody.playerId);
            } else {
                props.room.send(client, this.getAnimationData());
            }
        }
    }

}

module.exports = AnimationObject;
