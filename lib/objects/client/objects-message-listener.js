/**
 *
 * Reldens - ObjectsMessageListener
 *
 */

const { Logger, sc } = require('@reldens/utils');
const { UserInterface } = require('../../game/client/user-interface');

class ObjectsMessageListener
{

    async executeClientMessageActions(props)
    {
        console.log(props);
        let roomEvents = props.roomEvents;
        // roomEvents.objectsUi[animProps.id];
        /*
        let animProps = roomEvents.sceneData.objectsAnimationsData[i];
        if(!sc.hasOwn(animProps, 'ui')){
            return;
        }
        if(!animProps.id){
            Logger.error(['Object ID not specified. Skipping registry:', animProps]);
            return;
        }
        let template = sc.get(animProps, 'template', 'assets/html/npc-dialog.html');
        roomEvents.objectsUi[animProps.id] = new UserInterface(roomEvents.gameManager, animProps.id, template);
        await roomEvents.gameManager.events.emit('reldens.createdUserInterface', {
            gameManager: roomEvents.gameManager,
            id: animProps.id,
            userInterface: roomEvents.objectsUi[animProps.id],
            ObjectsPlugin: this
        });
        */
    }
    
}

module.exports.ObjectsMessageListener = ObjectsMessageListener;
