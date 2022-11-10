/**
 *
 * Reldens - ObjectsMessageListener
 *
 */

const { TraderObjectUi } = require('./trader-object-ui');
const { Logger, sc } = require('@reldens/utils');

class ObjectsMessageListener
{

    async executeClientMessageActions(props)
    {
        let message = sc.get(props, 'message', false);
        if(!message){
            Logger.error('Missing message data.', props);
            return false;
        }
        let messageResult = sc.get(message, 'result', false);
        if(!messageResult){
            Logger.error('Missing result data.', props);
            return false;
        }
        let messageId = sc.get(message, 'id', false);
        if(!messageId){
            Logger.error('Missing Object ID.', props);
            return false;
        }
        let roomEvents = sc.get(props, 'roomEvents', false);
        if(!roomEvents){
            Logger.error('Missing RoomEvents.', props);
            return false;
        }
        let traderObjectUi = new TraderObjectUi({roomEvents, message});
        traderObjectUi.updateContents();
    }

}

module.exports.ObjectsMessageListener = ObjectsMessageListener;
