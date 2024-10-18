/**
 *
 * Reldens - DropObject
 *
 */

const { PickUpObject } = require('../../../../rewards/server/pick-up-object');
const { TargetDeterminer } = require('../../../../rewards/server/target-determiner');
const { AnimationObject } = require('./animation-object');
const { ObjectsConst } = require('../../../constants');

class DropObject extends AnimationObject
{

    constructor(props)
    {
        super(props);
        this.type = ObjectsConst.DROPS.PICK_UP_ACT;
        this.eventsPrefix = this.uid+'.'+ObjectsConst.EVENT_PREFIX.DROP;
        this.listenMessages = true;
        this.clientParams.type = ObjectsConst.DROPS.PICK_UP_ACT;
        this.clientParams.isInteractive = true;
        this.interactionArea = this.config.getWithoutLogs(
            'server/objects/drops/interactionsDistance',
            this.config.getWithoutLogs('server/objects/actions/interactionsDistance', 40)
        );
    }

    async onHit(props)
    {
        super.onHit(props);
        let playerBody = props.bodyA?.playerId ? props.bodyA : props.bodyB;
        if(!props.room || !playerBody.playerId){
            return;
        }
        if(!this.dautoPickUpOnHit && !this.config.getWithoutLogs('server/objects/drops/autoPickUpOnHit', false)){
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
