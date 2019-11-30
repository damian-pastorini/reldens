/**
 *
 * Reldens - ObjectsMessageObserver
 *
 * This class will listen the messages received by the room and run the related actions, for example show the received
 * messages in the interface.
 *
 */

const { GameConst } = require('../../game/constants');

// @TODO: replace by events.
class ObjectsMessageObserver
{

    observeMessage(message, gameManager)
    {
        // objects events:
        if(message.act === GameConst.OBJECT_ANIMATION){
            let currentScene = gameManager.activeRoomEvents.getActiveScene();
            if({}.hasOwnProperty.call(currentScene.objectsAnimations, message.key)){
                currentScene.objectsAnimations[message.key].runAnimation();
            }
        }
    }

}

module.exports.ObjectsMessageObserver = ObjectsMessageObserver;
