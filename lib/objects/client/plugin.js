/**
 *
 * Reldens - Objects Client Plugin
 *
 * Client-side plugin for handling game objects, animations, and interactions.
 *
 */

const { ObjectsMessageListener } = require('./objects-message-listener');
const { DropsMessageListener } = require('./drops-message-listener');
const { TranslationsMapper } = require('../../snippets/client/translations-mapper');
const { UserInterface } = require('../../game/client/user-interface');
const { PluginInterface } = require('../../features/plugin-interface');
const { RoomStateEntitiesManager } = require('../../game/client/communication/room-state-entities-manager');
const { ObjectBattleAnimation } = require('./object-battle-animation');
const { ObjectAnimationFactory } = require('./object-animation-factory');
const { ObjectsConst } = require('../constants');
const { GameConst } = require('../../game/constants');
const Translations = require('./snippets/en_US');
const { Logger, sc } = require('@reldens/utils');

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
     * @returns {Promise<boolean>}
     */
    async setup(props)
    {
        /** @type {GameManager|false} */
        this.gameManager = sc.get(props, 'gameManager', false);
        if(!this.gameManager){
            Logger.error('Game Manager undefined in InventoryPlugin.');
            return false;
        }
        /** @type {EventsManager|false} */
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in InventoryPlugin.');
            return false;
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
        let missingSpritesTimeOut = this.gameManager.config.getWithoutLogs(
            'client/general/animations/missingSpritesTimeOut',
            200
        );
        let missingSpritesMaxRetries = this.gameManager.config.getWithoutLogs(
            'client/general/animations/missingSpritesMaxRetries',
            5
        );
        this.battleAnimation = new ObjectBattleAnimation({missingSpritesTimeOut, missingSpritesMaxRetries});
        this.animationFactory = new ObjectAnimationFactory(this.events);
        this.listenEvents();
        return true;
    }

    /**
     * @returns {boolean}
     */
    listenEvents()
    {
        if(!this.gameManager){
            return false;
        }
        if(!this.events){
            return false;
        }
        this.gameManager.config.client.message.listeners['traderObject'] = new ObjectsMessageListener();
        TranslationsMapper.forConfig(this.gameManager.config.client, Translations, ObjectsConst.MESSAGE.DATA_VALUES);
        // @NOTE: the prepareObjectsUi has to be created before the scenes, so we can use the scenes events before
        // the events were called.
        this.events.on('reldens.startEngineScene', async (roomEvents) => {
            await this.prepareObjectsUi(roomEvents.gameManager, roomEvents.roomData.objectsAnimationsData, roomEvents);
        });
        this.events.on('reldens.afterSceneDynamicCreate', async (sceneDynamic) => {
            await this.animationFactory.createDynamicAnimations(sceneDynamic);
        });
        this.events.on('reldens.joinedRoom', (room, gameManager) => {
            // @TODO - BETA - Refactor.
            this.listenMessages(room, gameManager);
            DropsMessageListener.listenMessages(room, gameManager);
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
            this.battleAnimation.objectBattleEndAnimation(message, gameManager);
        });
        if(!room.state || !room.state.bodies){
            room.onStateChange.once(() => {
                this.activateBodyCallbacks(room, gameManager);
            });
            return false;
        }
        this.activateBodyCallbacks(room, gameManager);
    }

    activateBodyCallbacks(room, gameManager)
    {
        this.setAddBodyCallback(room, gameManager);
        this.setRemoveBodyCallback(room);
    }

    setAddBodyCallback(room, gameManager)
    {
        // @TODO - BETA - Refactor and extract Colyseus into a driver.
        RoomStateEntitiesManager.onEntityAdd(room, 'bodies', (body, key) => {
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
            bodyManager.listen(body, propertyKey, async (newValue) => {
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
                return this.animationFactory.updateObjectsAnimations(key, body, currentScene);
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
     * @param {Object} room
     */
    setRemoveBodyCallback(room)
    {
        // @TODO - BETA - Refactor and extract Colyseus into a driver.
        RoomStateEntitiesManager.onEntityRemove(room, 'bodies', (body, key) => {
            if(-1 === key.indexOf('bullet') || !sc.hasOwn(this.bullets, key)){
                return false;
            }
            this.bullets[key].destroy();
            delete this.bullets[key];
        });
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

}

module.exports.ObjectsPlugin = ObjectsPlugin;
