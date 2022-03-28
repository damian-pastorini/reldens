/**
 *
 * Reldens - Objects Client Plugin.
 *
 */

const { AnimationEngine } = require('../../objects/client/animation-engine');
const { UserInterface } = require('../../game/client/user-interface');
const { ObjectsConst } = require('../constants');
const { ActionsConst } = require('../../actions/constants');
const { PluginInterface } = require('../../features/plugin-interface');
const { Logger, sc } = require('@reldens/utils');

class ObjectsPlugin extends PluginInterface
{

    setup(props)
    {
        this.gameManager = sc.get(props, 'gameManager', false);
        if(!this.gameManager){
            Logger.error('Game Manager undefined in InventoryPlugin.');
        }
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in InventoryPlugin.');
        }
        // @NOTE: the prepareObjectsUi has to be created before the scenes, so we can use the scenes events before
        // the events were called.
        // eslint-disable-next-line no-unused-vars
        this.events.on('reldens.startEngineScene', async (roomEvents, player, room, previousScene) => {
            await this.prepareObjectsUi(roomEvents.gameManager, roomEvents.sceneData.objectsAnimationsData, roomEvents);
        });
        // create animations for all the objects in the scene:
        this.events.on('reldens.afterSceneDynamicCreate', async (sceneDynamic) => {
            await this.createDynamicAnimations(sceneDynamic);
        });
        // listen messages:
        this.events.on('reldens.joinedRoom', (room, gameManager) => {
            this.listenMessages(room, gameManager);
        });
        this.bullets = [];
    }

    listenMessages(room, gameManager)
    {
        room.onMessage((message) => {
            // @TODO - BETA - Act will be replaced with the next Colyseus upgrade.
            if(message.act === ObjectsConst.OBJECT_ANIMATION || message.act === ObjectsConst.TYPE_ANIMATION){
                let currentScene = gameManager.activeRoomEvents.getActiveScene();
                if(sc.hasOwn(currentScene.objectsAnimations, message.key)){
                    currentScene.objectsAnimations[message.key].runAnimation();
                }
            }
            if(message.act === ActionsConst.BATTLE_ENDED){
                // @TODO - BETA - Replace all defaults by constants.
                let deathKey = sc.hasOwn(gameManager.config.client.skills.animations, message.k+'_death') ?
                    message.k+'_death' : 'default_death';
                let currentScene = gameManager.activeRoomEvents.getActiveScene();
                let skeletonSprite = currentScene.physics.add.sprite(message.x, message.y, deathKey);
                skeletonSprite.setDepth(200000);
                skeletonSprite.anims.play(deathKey, true).on('animationcomplete', () => {
                    skeletonSprite.destroy();
                });
                if(sc.hasOwn(message, 't') && message.t === currentScene.player.currentTarget.id){
                    gameManager.gameEngine.clearTarget();
                }
            }
        });
        if(room.state && room.state.bodies){
            room.state.bodies.onAdd = (body, key) => {
                if(key.indexOf('bullet') !== -1){
                    let currentScene = gameManager.activeRoomEvents.getActiveScene();
                    let animKey = 'default_bullet';
                    let skillBullet = (body.key ? body.key+'_' : '')+'bullet';
                    if(sc.hasOwn(gameManager.gameEngine.uiScene.directionalAnimations, skillBullet)){
                        skillBullet = skillBullet+'_'+body.dir;
                    }
                    if(sc.hasOwn(currentScene.anims.anims.entries, skillBullet)){
                        animKey = skillBullet;
                    }
                    let bulletSprite = currentScene.physics.add.sprite(body.x, body.y, animKey);
                    bulletSprite.setDepth(300000);
                    this.bullets[key] = bulletSprite;
                }
            };
            room.state.bodies.onRemove = (body, key) => {
                if(key.indexOf('bullet') !== -1 && sc.hasOwn(this.bullets, key)){
                    this.bullets[key].destroy();
                    delete this.bullets[key];
                }
            };
            room.state.bodies.onChange = async (body, key) => {
                await this.events.emit('reldens.objectBodyChange', {body, key});
                if(key.indexOf('bullet') !== -1){
                    this.bullets[key].x = body.x;
                    this.bullets[key].y = body.y;
                } else {
                    let currentScene = gameManager.activeRoomEvents.getActiveScene();
                    if(sc.hasOwn(currentScene.objectsAnimations, key)){
                        let objectAnimation = currentScene.objectsAnimations[key];
                        let objectNewDepth = body.y + objectAnimation.sceneSprite.height;
                        objectAnimation.sceneSprite.setDepth(objectNewDepth);
                        objectAnimation.sceneSprite.x = body.x;
                        objectAnimation.sceneSprite.y = body.y;
                        objectAnimation.x = body.x;
                        objectAnimation.y = body.y;
                        objectAnimation.animPos.x = body.x;
                        objectAnimation.animPos.y = body.y;
                        objectAnimation.inState = body.inState;
                        let animToPlay = sc.getByPriority(currentScene.anims.anims.entries, [
                            objectAnimation.key+'_'+body.dir,
                            objectAnimation.layerName+'_'+objectAnimation.id+'_'+body.dir,
                            objectAnimation.key
                        ]);
                        if(animToPlay){
                            objectAnimation.sceneSprite.anims.play(animToPlay, true);
                        }
                        this.moveSpritesObjects(objectAnimation, body.x, body.y, objectNewDepth);
                        if(!body.mov){
                            objectAnimation.sceneSprite.anims.stop();
                            objectAnimation.sceneSprite.mov = body.mov;
                            if(objectAnimation.autoStart){
                                let autoStartAnim = objectAnimation.autoStart === true ?
                                    objectAnimation.key : objectAnimation.autoStart === ObjectsConst.DYNAMIC_ANIMATION
                                        ? animToPlay : objectAnimation.autoStart;
                                objectAnimation.sceneSprite.anims.play(autoStartAnim);
                            }
                        }
                    }
                }
                await this.events.emit('reldens.objectBodyChanged', {body, key});
            };
        }
    }

    moveSpritesObjects(currentObj, x, y, objectNewDepth)
    {
        if(currentObj.moveSprites && Object.keys(currentObj.moveSprites).length){
            for(let i of Object.keys(currentObj.moveSprites)){
                let sprite = currentObj.moveSprites[i];
                sprite.x = x;
                sprite.y = y;
                // by default moving sprites will be always below the player:
                let spriteDepth = sc.hasOwn(currentObj.animationData, 'depthByPlayer')
                && currentObj.animationData['depthByPlayer'] === 'above'
                    ? objectNewDepth + 1 : objectNewDepth - 0.1;
                sprite.setDepth(spriteDepth);
            }
        }
    }

    async prepareObjectsUi(gameManager, objectsAnimationsData, roomEvents)
    {
        if(!objectsAnimationsData){
            Logger.info(['None objects animations data.', roomEvents]);
            return;
        }
        for(let i of Object.keys(objectsAnimationsData)){
            let animProps = objectsAnimationsData[i];
            if(!sc.hasOwn(animProps, 'ui')){
                continue;
            }
            if(!animProps.id){
                Logger.error(['Object ID not specified. Skipping registry:', animProps]);
                continue;
            }
            roomEvents.objectsUi[animProps.id] = new UserInterface(gameManager, animProps.id);
            await gameManager.events.emit('reldens.createdUserInterface', {
                gameManager,
                id: animProps.id,
                userInterface: roomEvents.objectsUi[animProps.id],
                ObjectsPlugin: this
            });
        }
    }

    async createDynamicAnimations(sceneDynamic)
    {
        let currentScene = sceneDynamic.gameManager.activeRoomEvents.getActiveScene();
        if(!currentScene.objectsAnimationsData){
            Logger.info(['None animations defined on this scene:', currentScene.key]);
            return;
        }
        await this.events.emit('reldens.createDynamicAnimationsBefore', this, sceneDynamic);
        for(let i of Object.keys(currentScene.objectsAnimationsData)){
            let animProps = currentScene.objectsAnimationsData[i];
            if(!animProps.key){
                Logger.error(['Animation key not specified. Skipping registry:', animProps]);
                continue;
            }
            animProps.frameRate = sceneDynamic.configuredFrameRate;
            await this.events.emit('reldens.createDynamicAnimation_'+animProps.key, this, animProps);
            // check for custom class:
            let classDefinition = sceneDynamic.gameManager.config.get(
                'client/customClasses/objects/'+animProps.key,
                true
            );
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

module.exports.ObjectsPlugin = ObjectsPlugin;
