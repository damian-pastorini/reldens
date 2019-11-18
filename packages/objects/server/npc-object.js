/**
 *
 * Reldens - NpcObject
 *
 * This is a base object class, AnimationsObject class will only send the run animation action to the client.
 *
 */

const BaseObject = require('./base-object');

class NpcObject extends BaseObject
{

    constructor(props)
    {
        super(props);
        // this is a hardcoded property for this specific object type:
        this.isNpc = true;
        this.hasAnimation = true;
        this.hasMass = 1;
        this.collisionResponse = true;
        // the actions will be false as default:
        this.runOnHit = false;
        this.runOnAction = false;
    }

    onHit(props)
    {
        // @TODO: - Seiyria - prefer the guard pattern;
        //   if(!this.runOnHit || !props.room) return
        //   this will prevent your code from getting too nested, and will make the logic easier to follow since bad
        //   cases return early
        if(this.runOnHit && props.room){
            let client = props.room.getClientById(props.playerBody.playerId);
            if(!client){
                console.log('ERROR - Object hit, client not found by playerId:', props.playerBody.playerId);
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

module.exports = NpcObject;
