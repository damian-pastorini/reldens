/**
 *
 * Reldens - DropObject
 *
 */

const { AnimationObject } = require('./animation-object');
const { RewardsConst } = require('../../../../rewards/constants');

class DropObject extends AnimationObject
{

    constructor(props)
    {
        super(props);
        this.type = RewardsConst.REWARDS_PICK_UP_ACT;
        this.eventsPrefix = RewardsConst.DROP_EVENT_PREFIX;
        this.listenMessages = true;
        this.clientParams.type = RewardsConst.REWARDS_PICK_UP_ACT;
        this.clientParams.isInteractive = true;
        this.interactionArea = this.config.get('server/rewards/actions/interactionsDistance');
    }

}

module.exports.DropObject = DropObject;
