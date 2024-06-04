/**
 *
 * Reldens - DropObject
 *
 */

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

}

module.exports.DropObject = DropObject;
