/**
 *
 * Reldens - DropObject
 *
 */

const { AnimationObject } = require('./animation-object');
const { ObjectsConst } = require('../../../constants');
const { RewardsConst } = require('../../../../rewards/constants');

class DropObject extends AnimationObject
{

    constructor(props)
    {
        super(props);
        this.type = RewardsConst.REWARDS_PICK_UP_ACT;
        this.eventsPrefix = ObjectsConst.EVENT_PREFIX.DROP;
        this.listenMessages = true;
        this.clientParams.type = RewardsConst.REWARDS_PICK_UP_ACT;
        this.clientParams.isInteractive = true;
        this.interactionArea = this.config.get('server/rewards/actions/interactionsDistance');
    }

}

module.exports.DropObject = DropObject;
