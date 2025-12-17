/**
 *
 * Reldens - Objects Client Plugin
 *
 * Client-side plugin for handling game objects, animations, and interactions.
 *
 */

const { AnimationEngine } = require('../../objects/client/animation-engine');
const { ObjectsMessageListener } = require('./objects-message-listener');
const { DropsMessageListener } = require('./drops-message-listener');
const Translations = require('./snippets/en_US');
const { TranslationsMapper } = require('../../snippets/client/translations-mapper');
const { UserInterface } = require('../../game/client/user-interface');
const { ObjectsConst } = require('../constants');
const { ActionsConst } = require('../../actions/constants');
const { PluginInterface } = require('../../features/plugin-interface');
const { GameConst } = require('../../game/constants');
const { Logger, sc } = require('@reldens/utils');
const { RoomStateEntitiesManager } = require('../../game/client/communication/room-state-entities-manager');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('../../game/client/game-manager').GameManager} GameManager - CUSTOM DYNAMIC
 * @typedef {import('../../game/client/room-events').RoomEvents} RoomEvents
 * @typedef {import('../../game/client/scene-dynamic').SceneDynamic} SceneDynamic
 */
class ObjectsPlugin extends PluginInterface
{

    /**
     * @param {Object} props
     */
    setup(props)
    {
        /** @type {GameManager|false} */
        this.gameManager = sc.get(props, 'gameManager', false);
        if(!this.gameManager){
            Logger.error('Game Manager undefined in InventoryPlugin.');
        }
        /** @type {EventsManager|false} */
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in InventoryPlugin.');
        }
        /** @type {Function|false} */
        this.bodyOnAddCallBack = false;
        /** @type {Function|false} */
        this.bodyOnRemoveCallBack = false;
        /** @type {Object<string, Object>} */
        this.bullets = {};
        /** @type {boolean} */
        this.changeBodyVisibilityOnInactiveState = this.gameManager.config.getWithoutLogs(
            'client/objects/animations/changeBodyVisibilityOnInactiveState',
            true
        );
        /** @type {number} */
        this.missingSpritesTimeOut = this.gameManager.config.getWithoutLogs(
            'client/general/animations/missingSpritesTimeOut',
            200
        );
        /** @type {number} */
        this.missingSpritesMaxRetries = this.gameManager.config.getWithoutLogs(
            'client/general/animations/missingSpritesMaxRetries',
            5
        );
        /** @type {number} */
        this.missingSpriteRetry = 0;
        this.listenEvents();
        this.setTranslations();
        this.setListener();
    }

    /**
     * @returns {boolean}
     */
    setListener()
    {
        if(!this.gameManager){
            return false;
        }
        this.gameManager.config.client.message.listeners['traderObject'] = new ObjectsMessageListener();
        return true;
    }

    /**
     * @returns {boolean}
     */
    setTranslations()
    {
        if(!this.gameManager){
            return false;
        }
        TranslationsMapper.forConfig(this.gameManager.config.client, Translations, ObjectsConst.MESSAGE.DATA_VALUES);
        return true;
    }

    /**
     * @returns {boolean}
     */
    listenEvents()
    {
        if(!this.events){
            return false;
        }
        // @NOTE: the prepareObjectsUi has to be created before the scenes, so we can use the scenes events before
        // the events were called.
        this.events.on('reldens.startEngineScene', async (roomEvents) => {
            await this.prepareObjectsUi(roomEvents.gameManager, roomEvents.roomData.objectsAnimationsData, roomEvents);
        });
        this.events.on('reldens.afterSceneDynamicCreate', async (sceneDynamic) => {
            await this.createDynamicAnimations(sceneDynamic);
        });
        this.events.on('reldens.joinedRoom', (room, gameManager) => {
            // @TODO - BETA - Refactor.
            this.listenMessages(room, gameManager);
            DropsMessageListener.listenMessages(room, gameManager);
        });
        this.events.on('reldens.beforeReconnectGameRoom', () => {
            this.disposeManagers();
        });
        return true;
    }

    /**
     * @param {Object} room
     * @param {GameManager} gameManager
     */
    listenMessages(room, gameManager)
    {
        room.onMessage('*', (message) => {
            this.startObjectAnimation(message, gameManager);
            this.objectBattleEndAnimation(message, gameManager);
        });
        if(!room.state || !room.state.bodies){
            return false;
        }
        this.setAddBodyCallback(room, gameManager);
        this.setRemoveBodyCallback(room);
    }

    /**
     * @param {Object} room
     * @param {GameManager} gameManager
     */
    setAddBodyCallback(room, gameManager)
    {
        // @TODO - BETA - Refactor and extract Colyseus into a driver.
        this.bodyManager = RoomStateEntitiesManager.onEntityAdd(room, 'bodies', (body, key) => {
            this.setOnChangeBodyCallback(body, key, room, gameManager);
            this.createBulletSprite(key, gameManager, body);
        });
    }

    /**
     * @param {string} key
     * @param {GameManager} gameManager
     * @param {Object} body
     * @returns {boolean}
     */
    createBulletSprite(key, gameManager, body)
    {
        if(-1 === key.indexOf('bullet')){
            return false;
        }
        let currentScene = gameManager.activeRoomEvents.getActiveScene();
        let animKey = 'default_bullet';
        let skillBullet = (body.key ? body.key + '_' : '') + 'bullet';
        if(sc.hasOwn(gameManager.gameEngine.uiScene.directionalAnimations, skillBullet)){
            skillBullet = skillBullet + '_' + body.dir;
        }
        if(sc.hasOwn(currentScene.anims.anims.entries, skillBullet)){
            animKey = skillBullet;
        }
        let bulletSprite = currentScene?.physics?.add?.sprite(body.x, body.y, animKey);
        if(!bulletSprite){
            Logger.warning('Could not create bullet sprite.', currentScene);
            return false;
        }
        bulletSprite.setDepth(11000);
        this.bullets[key] = bulletSprite;
        //Logger.debug({createdBulletSprite: skillBullet, shootFrom: body, bulletSprite});
        return true;
    }

    /**
     * @param {Object} body
     * @param {string} key
     * @param {Object} room
     * @param {Object} gameManager
     */
    setOnChangeBodyCallback(body, key, room, gameManager)
    {
        // @TODO - BETA - Refactor and extract Colyseus into a driver.
        let bodyManager = RoomStateEntitiesManager.createManager(room);
        let bodyProperties = Object.keys(body);
        for(let propertyKey of bodyProperties){
            bodyManager.listen(body, propertyKey, async (newValue, previousValue) => {
                //Logger.debug('Update body property "'+propertyKey+'": '+newValue);
                await this.events.emit('reldens.objectBodyChange', {body, key, changes: {[propertyKey]: newValue}});
                let currentScene = gameManager.activeRoomEvents.getActiveScene();
                this.updateBodyProperties(propertyKey, body, newValue, currentScene, key);
                if(!currentScene){
                    return;
                }
                let isBullet = -1 !== key.indexOf('bullet');
                let currentBody = isBullet ? this.bullets[key] : currentScene?.objectsAnimations[key];
                this.setVisibility(currentBody, GameConst.STATUS.ACTIVE === body.inState);
                this.logObjectBodyUpdate(key, propertyKey, newValue, currentBody);
                let canInterpolate = GameConst.STATUS.AVOID_INTERPOLATION !== body.inState;
                if(currentScene?.clientInterpolation && canInterpolate){
                    currentScene.interpolateObjectsPositions[key] = body;
                    return;
                }
                if(isBullet){
                    return this.updateBulletBodyPosition(key, body);
                }
                return this.updateObjectsAnimations(key, body, currentScene);
            });
        }
    }

    /**
     * @param {string} key
     * @param {string} propertyKey
     * @param {*} newValue
     * @param {Object} currentBody
     */
    logObjectBodyUpdate(key, propertyKey, newValue, currentBody)
    {
        let logValues = {key, propertyKey, newValue};
        if(('x' === propertyKey || 'y' === propertyKey) && currentBody && currentBody[propertyKey]){
            logValues.currentValue = currentBody[propertyKey];
        }
        //Logger.debug(logValues);
    }

    /**
     * @param {Object} currentBody
     * @param {boolean} isActive
     */
    setVisibility(currentBody, isActive)
    {
        if(!currentBody || !currentBody.sceneSprite){
            return;
        }
        currentBody.sceneSprite.setVisible(isActive);
    }

    /**
     * @param {string} bodyProp
     * @param {Object} body
     * @param {*} value
     * @param {Object} currentScene
     * @param {string} key
     */
    updateBodyProperties(bodyProp, body, value, currentScene, key)
    {
        // @TODO - BETA - Remove hardcoded properties check.
        //Logger.debug({update: body, key, animationData: currentScene.objectsAnimationsData[key], bodyProp, value});
        if(currentScene.objectsAnimationsData[key] && ('x' === bodyProp || 'y' === bodyProp)){
            // @TODO - BETA - Check why bullets keep receiving updates even after the objects animation was removed.
            currentScene.objectsAnimationsData[key][bodyProp] = value;
        }
        body[bodyProp] = value;
    }

    /**
     * @param {string} key
     * @param {Object} body
     */
    updateBulletBodyPosition(key, body)
    {
        if(!this.bullets[key]){
            return;
        }
        this.bullets[key].x = body.x;
        this.bullets[key].y = body.y;
        this.events.emit('reldens.objectBodyChanged', {body, key});
    }

    /**
     * @param {string} key
     * @param {Object} body
     * @param {Object} currentScene
     */
    updateObjectsAnimations(key, body, currentScene)
    {
        let objectAnimation = sc.get(currentScene.objectsAnimations, key);
        if(!objectAnimation || !sc.isFunction(objectAnimation.updateObjectAndSpritePositions)){
            Logger.error('Object animation update failed.', key, objectAnimation);
            return false;
        }
        objectAnimation.updateObjectAndSpritePositions(body.x, body.y);
        this.events.emit('reldens.objectBodyChanged', {body, key});
        let objectNewDepth = objectAnimation.updateObjectDepth();
        objectAnimation.inState = body.inState;
        let animToPlay = this.fetchAvailableAnimationKey(currentScene, objectAnimation, body);
        if('' !== animToPlay){
            objectAnimation.sceneSprite.anims.play(animToPlay, true);
        }
        this.moveSpritesObjects(objectAnimation, body.x, body.y, objectNewDepth);
        if(body.mov){
            return false;
        }
        objectAnimation.sceneSprite.anims.stop();
        objectAnimation.sceneSprite.mov = body.mov;
        if(!objectAnimation.autoStart){
            return false;
        }
        objectAnimation.sceneSprite.anims.play(
            this.determineAutoStartAnimation(objectAnimation, animToPlay)
        );
        return true;
    }

    /**
     * @param {Object} objectAnimation
     * @param {string} animToPlay
     * @returns {string|false}
     */
    determineAutoStartAnimation(objectAnimation, animToPlay)
    {
        if(true === objectAnimation.autoStart){
            return objectAnimation.key;
        }
        if(objectAnimation.autoStart === ObjectsConst.DYNAMIC_ANIMATION){
            return animToPlay;
        }
        return objectAnimation.autoStart;
    }

    /**
     * @param {Object} currentScene
     * @param {Object} objectAnimation
     * @param {Object} body
     * @returns {string}
     */
    fetchAvailableAnimationKey(currentScene, objectAnimation, body)
    {
        return sc.getByPriority(currentScene.anims.anims.entries, [
            objectAnimation.key + '_' + body.dir,
            objectAnimation.layerName + '_' + objectAnimation.id + '_' + body.dir,
            objectAnimation.key
        ]) || '';
    }

    /**
     * @param {Object} room
     */
    setRemoveBodyCallback(room)
    {
        // @TODO - BETA - Refactor and extract Colyseus into a driver.
        this.bodyRemoveManager = RoomStateEntitiesManager.onEntityRemove(room, 'bodies', (body, key) => {
            if(-1 === key.indexOf('bullet') || !sc.hasOwn(this.bullets, key)){
                return false;
            }
            this.bullets[key].destroy();
            delete this.bullets[key];
        });
    }

    disposeManagers()
    {
        if(this.bodyManager){
            this.bodyManager.dispose();
            this.bodyManager = null;
        }
        if(this.bodyRemoveManager){
            this.bodyRemoveManager.dispose();
            this.bodyRemoveManager = null;
        }
    }

    /**
     * @param {Object} message
     * @param {GameManager} gameManager
     * @returns {boolean}
     */
    objectBattleEndAnimation(message, gameManager)
    {
        if(message.act !== ActionsConst.BATTLE_ENDED){
            return false;
        }
        // @TODO - BETA - Replace all defaults by constants.
        let deathKey = sc.get(gameManager.config.client.skills.animations, message.k + '_death', 'default_death');
        let currentScene = gameManager.activeRoomEvents.getActiveScene();
        try {
            this.playDeathAnimation(deathKey, currentScene, message);
        } catch (error) {
            Logger.warning('Error on sprite "'+deathKey+'" not available.', error.message);
        }
        if(!sc.hasOwn(message, ActionsConst.DATA_OBJECT_KEY_TARGET)){
            return false;
        }
        if(message[ActionsConst.DATA_OBJECT_KEY_TARGET] === currentScene.player.currentTarget?.id){
            gameManager.gameEngine.clearTarget();
        }
        let hidePlayerSprite = sc.get(currentScene.player.players, message[ActionsConst.DATA_OBJECT_KEY_TARGET], false);
        if(!hidePlayerSprite){
            return false;
        }
        hidePlayerSprite.visible = false;
        if(sc.hasOwn(hidePlayerSprite, 'nameSprite') && hidePlayerSprite.nameSprite){
            hidePlayerSprite.nameSprite.visible = false;
        }
    }

    /**
     * @param {string} deathKey
     * @param {Object} currentScene
     * @param {Object} message
     * @returns {boolean}
     */
    playDeathAnimation(deathKey, currentScene, message)
    {
        if(!currentScene.getAnimationByKey(deathKey)){
            if(this.missingSpritesMaxRetries === this.missingSpriteRetry){
                Logger.debug('Sprite "'+deathKey+'" not available.', deathKey);
                return false;
            }
            this.missingSpriteRetry++;
            setTimeout(
                () => {
                    return this.playDeathAnimation(deathKey, currentScene, message);
                },
                this.missingSpritesTimeOut
            );
            return false;
        }
        let skeletonSprite = currentScene.physics.add.sprite(message.x, message.y, deathKey);
        skeletonSprite.setDepth(10500);
        skeletonSprite.anims.play(deathKey, true).on('animationcomplete', () => {
            skeletonSprite.destroy();
        });
        return true;
    }

    /**
     * @param {Object} message
     * @param {GameManager} gameManager
     * @returns {boolean}
     */
    startObjectAnimation(message, gameManager)
    {
        if(message.act !== ObjectsConst.OBJECT_ANIMATION && message.act !== ObjectsConst.TYPE_ANIMATION){
            return false;
        }
        let currentScene = gameManager.activeRoomEvents.getActiveScene();
        if(!sc.hasOwn(currentScene.objectsAnimations, message.key)){
            return false;
        }
        currentScene.objectsAnimations[message.key].runAnimation();
    }

    /**
     * @param {Object} currentObj
     * @param {number} x
     * @param {number} y
     * @param {number} objectNewDepth
     */
    moveSpritesObjects(currentObj, x, y, objectNewDepth)
    {
        if(!currentObj.moveSprites){
            return;
        }
        let moveObjectsKeys = Object.keys(currentObj.moveSprites);
        if(0 === moveObjectsKeys.length){
            return;
        }
        for(let i of moveObjectsKeys){
            let sprite = currentObj.moveSprites[i];
            sprite.x = x;
            sprite.y = y;
            // by default moving sprites will be always below the player:
            let depthByPlayer = sc.get(currentObj.animationData, 'depthByPlayer', '');
            let spriteDepth = objectNewDepth + ((depthByPlayer === 'above') ? 1 : -0.1);
            sprite.setDepth(spriteDepth);
        }
    }

    /**
     * @param {GameManager} gameManager
     * @param {object} objectsAnimationsData
     * @param {RoomEvents} roomEvents
     * @returns {Promise<void>}
     */
    async prepareObjectsUi(gameManager, objectsAnimationsData, roomEvents)
    {
        if(!objectsAnimationsData){
            Logger.info('None objects animations data.');
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
            let template = sc.get(animProps, 'template', '/assets/html/dialog-box.html');
            roomEvents.objectsUi[animProps.id] = new UserInterface(gameManager, animProps, template, 'npcDialog');
            await gameManager.events.emit('reldens.createdUserInterface', {
                gameManager,
                id: animProps.id,
                userInterface: roomEvents.objectsUi[animProps.id],
                ObjectsPlugin: this
            });
        }
    }

    /**
     * @param {SceneDynamic} sceneDynamic
     * @returns {Promise<void>}
     */
    async createDynamicAnimations(sceneDynamic)
    {
        if(!sceneDynamic.objectsAnimationsData){
            Logger.info('None animations defined on this scene: '+sceneDynamic.key);
            return;
        }
        await this.events.emit('reldens.createDynamicAnimationsBefore', this, sceneDynamic);
        for(let i of Object.keys(sceneDynamic.objectsAnimationsData)){
            let animProps = sceneDynamic.objectsAnimationsData[i];
            await this.createAnimationFromAnimData(animProps, sceneDynamic);
        }
    }

    /**
     * @param {Object} animProps
     * @param {SceneDynamic} sceneDynamic
     * @returns {Promise<Object|false>}
     */
    async createAnimationFromAnimData(animProps, sceneDynamic)
    {
        if(!animProps.key){
            Logger.error('Animation key not specified. Skipping registry.', animProps);
            return false;
        }
        animProps.frameRate = sceneDynamic.configuredFrameRate;
        let activeRoomEvents = sceneDynamic.gameManager.activeRoomEvents;
        let existentBody = this.fetchExistentBody(sceneDynamic, activeRoomEvents, animProps);
        this.updateAnimationPosition(existentBody, animProps);
        await this.events.emit('reldens.createDynamicAnimation_'+animProps.key, this, animProps);
        let classDefinition = sceneDynamic.gameManager.config.getWithoutLogs(
            'client/customClasses/objects/'+animProps.key,
            AnimationEngine
        );
        let animationEngine = new classDefinition(sceneDynamic.gameManager, animProps, sceneDynamic);
        // @NOTE: this will populate the objectsAnimations property in the current scene, see scene-dynamic.
        let sprite = animationEngine.createAnimation();
        this.updateAnimationVisibility(existentBody, sprite);
        return animationEngine;
    }

    /**
     * @param {Object} existentBody
     * @param {Object} animProps
     */
    updateAnimationPosition(existentBody, animProps)
    {
        // Logger.debug('Existent body:', {existentBody});
        if(!existentBody){
            // expected, not all animation objects may have a body:
            return false;
        }
        // @NOTE: respawn objects would have the animProp position outdated since it comes from the roomData, which
        // only contains the objects original initial position.
        //Logger.debug('Existent body "'+animProps.key+'" position:', {x: existentBody.x, y: existentBody.y});
        //Logger.debug('AnimProps "'+animProps.key+'" position:', {x: animProps.x, y: animProps.y});
        if(animProps.x !== existentBody.x){
            animProps.x = existentBody.x;
        }
        if(animProps.y !== existentBody.y){
            animProps.y = existentBody.y;
        }
    }

    /**
     * @param {Object} existentBody
     * @param {Object} sprite
     */
    updateAnimationVisibility(existentBody, sprite)
    {
        if(!existentBody){
            // expected, not all animation objects may have a body:
            return false;
        }
        if(GameConst.STATUS.DEATH !== existentBody.inState && GameConst.STATUS.DISABLED !== existentBody.inState){
            return false;
        }
        sprite.visible = false;
    }

    /**
     * @param {Object} sceneDynamic
     * @param {Object} activeRoomEvents
     * @param {Object} animProps
     * @returns {Object|false}
     */
    fetchExistentBody(sceneDynamic, activeRoomEvents, animProps)
    {
        //Logger.debug('Scene key vs roomName: '+sceneDynamic.key+' / '+activeRoomEvents.roomName+'.');
        if(sceneDynamic.key !== activeRoomEvents.roomName){
            Logger.warning('Scene key and roomName miss match: '+sceneDynamic.key+' / '+activeRoomEvents.roomName+'.');
            return false;
        }
        return activeRoomEvents.room.state.bodies.get(animProps?.key);
    }
}

module.exports.ObjectsPlugin = ObjectsPlugin;
