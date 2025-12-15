/**
 *
 * Reldens - DropObject
 *
 * Represents a droppable object/loot that players can pick up.
 *
 */

const { PickUpObject } = require('../../../../rewards/server/pick-up-object');
const { TargetDeterminer } = require('../../../../rewards/server/target-determiner');
const { AnimationObject } = require('./animation-object');
const { ObjectsConst } = require('../../../constants');

class DropObject extends AnimationObject
{

    /**
     * @param {Object} props
     */
    constructor(props)
    {
        super(props);
        /** @type {string} */
        this.type = ObjectsConst.DROPS.PICK_UP_ACT;
        /** @type {string} */
        this.eventsPrefix = this.uid+'.'+ObjectsConst.EVENT_PREFIX.DROP;
        /** @type {boolean} */
        this.listenMessages = true;
        /** @type {string} */
        this.clientParams.type = ObjectsConst.DROPS.PICK_UP_ACT;
        /** @type {boolean} */
        this.clientParams.isInteractive = true;
        /** @type {number} */
        this.interactionArea = this.config.getWithoutLogs(
            'server/objects/drops/interactionsDistance',
            this.config.getWithoutLogs('server/objects/actions/interactionsDistance', 40)
        );
        /** @type {boolean} */
        this.autoPickUpOnHit = false;
    }

    /**
     * @param {Object} props
     * @returns {Promise<Object|undefined>}
     */
    async onHit(props)
    {
        super.onHit(props);
        let playerBody = props.bodyA?.playerId ? props.bodyA : props.bodyB;
        if(!props.room || !playerBody.playerId){
            return;
        }
        if(!this.autoPickUpOnHit && !this.config.getWithoutLogs('server/objects/drops/autoPickUpOnHit', false)){
            return;
        }
        let playerSchema = props.room.playerBySessionIdFromState(playerBody.playerId);
        if(!playerSchema){
            return;
        }
        let targetDeterminer = new TargetDeterminer(props.room.featuresManager?.featuresList?.teams.package);
        return await PickUpObject.execute(this, props.room, playerSchema, targetDeterminer);
    }

}

module.exports.DropObject = DropObject;
