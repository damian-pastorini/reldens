/**
 *
 * Reldens - ObjectsMessageObserver
 *
 * This class will listen the messages received by the room and run the related actions, for example show the received
 * messages in the interface.
 *
 */

 // @TODO: - Seiyria - share is a very ambiguous term, and it doesn't seem to be self explanatory what it is or does
const { GameConst } = require('../../game/constants');

// @TODO: - Seiyria - this seems to be some kind of ECS implementation. if that is true, I would recommend getting an
//   existing ECS implementation. alternatively, you could set up a simple one with Signals, Event Emitters, or
//   Observables - this will be more intuitive to someone getting into your project
class ObjectsMessageObserver
{

    observeMessage(message, gameManager)
    {
        // objects events:
        if(message.act === GameConst.OBJECT_ANIMATION){
            let currentScene = gameManager.activeRoomEvents.getActiveScene();
            if(currentScene.objectsAnimations.hasOwnProperty(message.key)){
                currentScene.objectsAnimations[message.key].runAnimation();
            }
        }
    }

}

// @TODO: - Seiyria - don't do default exports. always do module.exports.x = x; you never know when you'll want to add
//   an extra export. default exports also cause problems with some build systems, especially if you move to typescript.
module.exports = ObjectsMessageObserver;
