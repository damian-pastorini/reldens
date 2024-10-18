/**
 *
 * Reldens - AnimationObject
 *
 * This is a base object class, AnimationsObject class will only send the run animation action to the client.
 *
 */

const { BaseObject } = require('./base-object');
const { ObjectsConst } = require('../../../constants');
const { Logger, sc } = require('@reldens/utils');

class AnimationObject extends BaseObject
{

    constructor(props)
    {
        super(props);
        this.type = ObjectsConst.TYPE_ANIMATION;
        this.isAnimation = true;
        this.eventsPrefix = this.uid+'.'+ObjectsConst.EVENT_PREFIX.ANIMATION;
        // the clientParams are all public params broadcast to the client:
        this.clientParams = {
            type: this.type,
            enabled: true,
            ui: true,
            frameStart: sc.get(props, 'frameStart', 0),
            // @NOTE: default animations considered are 3 columns sprites.
            frameEnd: sc.get(props, 'frameEnd', 3),
            repeat: sc.get(props, 'repeat', -1),
            hideOnComplete: sc.get(props, 'hideOnComplete', false),
            autoStart: sc.get(props, 'autoStart', false)
        };
        this.mapClientParams(props);
        this.mapPrivateParams(props);
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
        if(sc.isTrue(this, 'roomVisible')){
            // run for everyone in the room:
            props.room.broadcast('*', this.animationData);
        }
        if(sc.isTrue(this, 'playerVisible')){
            let playerBody = sc.hasOwn(props.bodyA, 'playerId') ? props.bodyA : props.bodyB;
            let client = props.room.getClientById(playerBody.playerId);
            if(!client){
                Logger.error('Object hit, client not found by playerId:', playerBody.playerId);
                return;
            }
            client.send('*', this.animationData);
        }
    }

    onAction(props)
    {
        if(!this.runOnAction || !props.room){
            Logger.debug('Disabled runOnAction or missing room.');
            return;
        }
        // run for everyone in the room:
        if(sc.isTrue(this, 'roomVisible')){
            props.room.broadcast('*', this.animationData);
        }
        // run only for the client who executed the action:
        if(!sc.isTrue(this, 'playerVisible')){
            let playerId = sc.get(props.playerBody, 'playerId', false);
            if(!playerId){
                return;
            }
            let client = props.room.getClientById(playerId);
            if(!client){
                Logger.error('Object action, client not found by playerId: '+playerId);
                return;
            }
            client.send('*', this.animationData);
        }
    }

    chaseBody(body)
    {
        if(!this.objectBody){
            Logger.error('Missing object body on chase.', {chasingObjectKey: this.key});
            return false;
        }
        if(!body){
            Logger.error('Missing player body to chase.', {chasingObjectKey: this.key});
            return false;
        }
        if(!this.objectBody.world){
            Logger.error('Missing object body world.', this.objectBody.id);
            return false;
        }
        if(!this.objectBody.world.pathFinder){
            Logger.error('Missing object body world pathfinder.', this.objectBody.id);
            return false;
        }
        this.objectBody.resetAuto();
        if(this.objectBody.disableObjectsCollisionsOnChase){
            this.objectBody.setShapesCollisionGroup(0);
        }
        body.updateCurrentPoints();
        let toPoint = {column: body.currentCol, row: body.currentRow};
        return this.objectBody.moveToPoint(toPoint);
    }

}

module.exports.AnimationObject = AnimationObject;
