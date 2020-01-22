/**
 *
 * Reldens - Objects Client Package.
 *
 */

const { AnimationEngine } = require('../../objects/client/animation-engine');
const { UserInterface } = require('../../game/client/user-interface');
const { EventsManager } = require('../../game/events-manager');
const { ObjectsConst } = require('../constants');
const { Logger } = require('../../game/logger');

class ObjectsPack
{

    constructor()
    {
        // @NOTE: the prepare objects ui has to be created before the scenes so we can use the scenes events before
        // the events were called.
        // eslint-disable-next-line no-unused-vars
        EventsManager.on('reldens.startEngineScene', (roomEvents, player, room, previousScene) => {
            this.prepareObjectsUi(roomEvents.gameManager, roomEvents.sceneData.objectsAnimationsData, roomEvents);
        });
        // create animations for all the objects in the scene:
        EventsManager.on('reldens.afterSceneDynamicCreate', (sceneDynamic) => {
            this.createDynamicAnimations(sceneDynamic);
        });
        // listen messages:
        EventsManager.on('reldens.joinedRoom', (room, gameManager) => {
            this.listenMessages(room, gameManager);
        });
    }

    listenMessages(room, gameManager)
    {
        room.onMessage((message) => {
            //@TODO: TEMP. just use object types?
            if(message.act === ObjectsConst.OBJECT_ANIMATION || message.act === ObjectsConst.TYPE_ANIMATION){
                let currentScene = gameManager.activeRoomEvents.getActiveScene();
                if({}.hasOwnProperty.call(currentScene.objectsAnimations, message.key)){
                    currentScene.objectsAnimations[message.key].runAnimation();
                }
            }
        });
    }

    prepareObjectsUi(gameManager, objectsAnimationsData, roomEvents)
    {
        if(!objectsAnimationsData){
            Logger.info(['None objects animations data.', roomEvents]);
            return;
        }
        for(let idx in objectsAnimationsData){
            let animProps = objectsAnimationsData[idx];
            if(!{}.hasOwnProperty.call(animProps, 'ui')){
                continue;
            }
            if(!animProps.id){
                Logger.error(['Object ID not specified. Skipping registry:', animProps]);
                continue;
            }
            roomEvents.objectsUi[animProps.id] = new UserInterface(gameManager, animProps.id);
        }
    }

    createDynamicAnimations(sceneDynamic)
    {
        let currentScene = sceneDynamic.gameManager.activeRoomEvents.getActiveScene();
        if(!currentScene.objectsAnimationsData){
            Logger.info(['None animations defined on this scene:', currentScene.key]);
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

module.exports.ObjectsPack = ObjectsPack;
