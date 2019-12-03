/**
 *
 * Reldens - Objects Client Package.
 *
 */

const { AnimationEngine } = require('../../objects/client/animation-engine');
const { EventsManager } = require('../../game/events-manager');
const { ObjectsConst } = require('../constants');

class Objects
{

    constructor()
    {
        // animations run on :
        EventsManager.on('reldens.joinedRoom', (room, gameManager) => {
            this.listenMessages(room, gameManager);
        });
        // create animations for all the objects in the scene:
        EventsManager.on('reldens.afterSceneDynamicCreate', (sceneDynamic) => {
            this.createDynamicAnimations(sceneDynamic);
        });
    }

    listenMessages(room, gameManager)
    {
        room.onMessage((message) => {
            if(message.act === ObjectsConst.OBJECT_ANIMATION){
                let currentScene = gameManager.activeRoomEvents.getActiveScene();
                if({}.hasOwnProperty.call(currentScene.objectsAnimations, message.key)){
                    currentScene.objectsAnimations[message.key].runAnimation();
                }
            }
        });
    }

    createDynamicAnimations(sceneDynamic)
    {
        let currentScene = sceneDynamic.gameManager.activeRoomEvents.getActiveScene();
        if(!currentScene.objectsAnimationsData){
            return;
        }
        for(let idx in currentScene.objectsAnimationsData){
            let animProps = currentScene.objectsAnimationsData[idx];
            animProps.frameRate = sceneDynamic.configuredFrameRate;
            // create the animation object instance:
            let animation = new AnimationEngine(sceneDynamic.gameManager, animProps, sceneDynamic);
            // @NOTE: this will populate the objectsAnimations property in the current scene, see scene-dynamic.
            animation.createAnimation();
        }
    }

}

module.exports.Objects = Objects;
