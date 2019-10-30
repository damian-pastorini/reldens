/**
 *
 * Reldens - ObjectsMessageObserver
 *
 * This class will listen the messages received by the room and run the related actions, for example show the received
 * messages in the interface.
 *
 */

const share = require('../utils/constants');

class ObjectsMessageObserver
{

    observeMessage(message, gameManager)
    {
        // objects events:
        if(message.act === share.OBJECT_ANIMATION){
            let currentScene = gameManager.activeRoomEvents.getActiveScene();
            if(currentScene.objectsAnimations.hasOwnProperty(message.key)){
                currentScene.objectsAnimations[message.key].runAnimation();
            }
        }
    }

}

module.exports = ObjectsMessageObserver;
