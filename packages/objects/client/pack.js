/**
 *
 * Reldens - Objects Client Package.
 *
 */

const { AnimationEngine } = require('../../objects/client/animation-engine');
const { EventsManager } = require('../../game/events-manager');
const { ObjectsConst } = require('../constants');
const { Logger } = require('../../game/logger');

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
        EventsManager.emit('reldens.createDynamicAnimationsBefore', this, sceneDynamic);
        for(let idx in currentScene.objectsAnimationsData){
            let animProps = currentScene.objectsAnimationsData[idx];
            if(!animProps.key){
                Logger.error(['Animation key not specified. Skipping registry:', animProps]);
                continue;
            }
            animProps.frameRate = sceneDynamic.configuredFrameRate;
            EventsManager.emit('reldens.createDynamicAnimation_'+animProps.key, this, animProps);
            // check for custom class:
            let classDefinition = sceneDynamic.gameManager.config.get('customClasses/objects/'+animProps.key, true);
            if(!classDefinition){
                // or set default:
                classDefinition = AnimationEngine;
            }
            // create the animation object instance:
            let animation = new classDefinition(sceneDynamic.gameManager, animProps, sceneDynamic);
            // @NOTE: this will populate the objectsAnimations property in the current scene, see scene-dynamic.
            animation.createAnimation();
        }
    }

}

module.exports.Objects = Objects;
