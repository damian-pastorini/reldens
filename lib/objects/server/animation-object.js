/**
 *
 * Reldens - AnimationObject
 *
 * This is a base object class, AnimationsObject class will only send the run animation action to the client.
 *
 */

const { BaseObject } = require('./base-object');
const { ObjectsConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

class AnimationObject extends BaseObject
{

    constructor(props)
    {
        super(props);
        // object type:
        this.type = ObjectsConst.TYPE_ANIMATION;
        this.clientParams.type = this.type;
        this.isAnimation = true;
        this.eventsPrefix = 'ao';
        // the actions will be false as default:
        this.runOnHit = false;
        this.runOnAction = false;
        this.objectBody = false;
        // assign extra public params:
        this.clientParams = Object.assign({
            enabled: true,
            frameStart: sc.get(props, 'frameStart', 0),
            // @NOTE: default animations considered are 3 columns sprites.
            frameEnd: sc.get(props, 'frameEnd', 3),
            repeat: sc.get(props, 'repeat', -1),
            hideOnComplete: sc.get(props, 'hideOnComplete', false),
            autoStart: sc.get(props, 'autoStart', false)
        }, this.clientParams);
    }

    get animationData()
    {
        return {
            act: this.type,
            key: this.key,
            clientParams: this.clientParams,
            x: this.x,
            y: this.y
        };
    }

    onHit(props)
    {
        if(!this.runOnHit || !props.room){
            return;
        }
        if(sc.isTrue(this, 'playerVisible')){
            let playerBody = sc.hasOwn(props.bodyA, 'playerId') ? props.bodyA : props.bodyB;
            let client = props.room.getClientById(playerBody.playerId);
            if(!client){
                Logger.error('Object hit, client not found by playerId:', playerBody.playerId);
            } else {
                client.send('*', this.animationData);
            }
        }
        if(sc.isTrue(this, 'roomVisible')){
            // run for everyone in the room:
            props.room.broadcast('*', this.animationData);
        }
    }

    onAction(props)
    {
        if(!this.runOnAction || !props.room){
            return;
        }
        if(sc.isTrue(this, 'playerVisible')){
            // run only for the client who executed:
            let client = props.room.getClientById(props.playerBody.playerId);
            if(!client){
                Logger.error(['Object action, client not found by playerId:', props.playerBody.playerId]);
            } else {
                client.send('*', this.animationData);
            }
        }
        if(sc.isTrue(this, 'roomVisible')){
            // run for everyone in the room:
            props.room.broadcast('*', this.animationData);
        }
    }

    chaseBody(body)
    {
        if(!this.objectBody || !body){
            Logger.error(['Body not found.', 'Object:', this.objectBody, 'Player:', body]);
            return false;
        }
        if(!this.objectBody.world){
            Logger.error('Object Body null world.', this.objectBody);
            return false;
        }
        if(!this.objectBody.world.pathFinder){
            return false;
        }
        this.objectBody.resetAuto();
        body.updateCurrentPoints();
        let toPoint = {column: body.currentCol, row: body.currentRow};
        return this.objectBody.moveToPoint(toPoint);
    }

}

module.exports.AnimationObject = AnimationObject;
