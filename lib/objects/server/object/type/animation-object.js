/**
 *
 * Reldens - AnimationObject
 *
 * Base class for objects with animation capabilities. Extends BaseObject to add animation broadcasting to clients.
 *
 */

const { BaseObject } = require('./base-object');
const { ObjectsConst } = require('../../../constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../../../world/server/physical-body').PhysicalBody} PhysicalBody
 */
class AnimationObject extends BaseObject
{

    /**
     * @param {Object} props
     */
    constructor(props)
    {
        super(props);
        /** @type {string} */
        this.type = ObjectsConst.TYPE_ANIMATION;
        /** @type {boolean} */
        this.isAnimation = true;
        /** @type {string} */
        this.eventsPrefix = this.uid+'.'+ObjectsConst.EVENT_PREFIX.ANIMATION;
        // @TODO - BETA - Create a ClientParams class.
        /** @type {Object} */
        this.clientParams = {
            type: this.type,
            enabled: true,
            ui: true,
            // @NOTE: by default, we do not have any animations if these are not specified in the object.
            frameStart: sc.get(props, 'frameStart', 0),
            frameEnd: sc.get(props, 'frameEnd', 0),
            repeat: sc.get(props, 'repeat', 0),
            hideOnComplete: sc.get(props, 'hideOnComplete', false),
            autoStart: sc.get(props, 'autoStart', false)
        };
        this.mapClientParams(props);
        this.mapPrivateParams(props);
    }

    /**
     * @returns {Object}
     */
    get animationData()
    {
        // @TODO - BETA - Create an AnimationsData class.
        return {
            act: this.type,
            key: this.key,
            clientParams: this.clientParams,
            x: this.x,
            y: this.y
        };
    }

    /**
     * @param {Object} props
     */
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

    /**
     * @param {Object} props
     */
    onAction(props)
    {
        if(!this.runOnAction || !props.room){
            //Logger.debug('Disabled runOnAction or missing room.');
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

    /**
     * @param {PhysicalBody} body
     * @returns {boolean|undefined}
     */
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
