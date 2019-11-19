/**
 *
 * Reldens - AnimationObject
 *
 * This is a base object class, AnimationsObject class will only send the run animation action to the client.
 *
 */

const { BaseObject } = require('./base-object');
const { GameConst } = require('../../game/constants');
const { Logger } = require('../../game/logger');

class AnimationObject extends BaseObject
{

    // @TODO: - Seiyria ideally, all of your object props should be declared here, so someone can figure out at a glance
    //   what properties are available. for example:
    // isAnimation = true
    // key = '';
    // this would let you track what properties exist without having to check all the functions on the object
    constructor(props)
    {
        super(props);
        // this is a hardcoded property for this specific object type:
        this.isAnimation = true;
        // the actions will be false as default:
        this.runOnHit = false;
        this.runOnAction = false;
    }

    get animationData()
    {
        return {
            act: GameConst.OBJECT_ANIMATION,
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
                Logger.error('Object hit, client not found by playerId:', props.playerBody.playerId);
            } else {
                props.room.send(client, this.animationData);
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
                props.room.send(client, this.animationData);
            }
        }
    }

}

module.exports = AnimationObject;
