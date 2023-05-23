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
            Logger.error('Missing message data on ObjectsMessageListener.', props);
            return false;
        }
        let messageResult = sc.get(message, 'result', false);
        if(!messageResult){
            Logger.error('Missing result data on ObjectsMessageListener.', props);
            return false;
        }
        let messageId = sc.get(message, 'id', false);
        if(!messageId){
            Logger.error('Missing Object ID on ObjectsMessageListener.', props);
            return false;
        }
        let roomEvents = sc.get(props, 'roomEvents', false);
        if(!roomEvents){
            Logger.error('Missing RoomEvents on ObjectsMessageListener.', props);
            return false;
        }
        // @TODO - BETA - Rename class to TraderObjectMessageHandler, split in several services.
        let traderObjectUi = new TraderObjectUi({roomEvents, message});
        if(!traderObjectUi.validate()){
            return false;
        }
        traderObjectUi.updateContents();
    }

}

module.exports.ObjectsMessageListener = ObjectsMessageListener;
