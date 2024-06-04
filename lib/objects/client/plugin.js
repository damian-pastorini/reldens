/**
 *
 * Reldens - Objects Client Plugin
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
        this.bodyOnAddCallBack = false;
        this.bodyOnRemoveCallBack = false;
        this.bullets = {};
        this.listenEvents();
        this.setTranslations();
        this.setListener();
    }

    setListener()
    {
        if(!this.gameManager){
            return false;
        }
        this.gameManager.config.client.message.listeners['traderObject'] = new ObjectsMessageListener();
    }

    setTranslations()
    {
        if(!this.gameManager){
            return false;
        }
        TranslationsMapper.forConfig(this.gameManager.config.client, Translations, ObjectsConst.MESSAGE.DATA_VALUES);
    }

    listenEvents()
    {
        if(!this.events){
            return false;
        }
        // @NOTE: the prepareObjectsUi has to be created before the scenes, so we can use the scenes events before
        // the events were called.
        this.events.on('reldens.startEngineScene', async (roomEvents) => {
            await this.prepareObjectsUi(roomEvents.gameManager, roomEvents.sceneData.objectsAnimationsData, roomEvents);
        });
        this.events.on('reldens.afterSceneDynamicCreate', async (sceneDynamic) => {
            await this.createDynamicAnimations(sceneDynamic);
        });
        this.events.on('reldens.joinedRoom', (room, gameManager) => {
            // @TODO - BETA - Refactor.
            this.listenMessages(room, gameManager);
            DropsMessageListener.listenMessages(room, gameManager);
        });
    }

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

    setAddBodyCallback(room, gameManager)
    {
        // @TODO - BETA - Refactor and extract Colyseus into a driver.
        this.bodyOnAddCallBack = room.state.bodies.onAdd((body, key) => {
            this.setOnChangeBodyCallback(body, key, room, gameManager);
            this.createBulletSprite(key, gameManager, body);
        });
    }

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
        Logger.debug({createdBulletSprite: skillBullet, shootFrom: body, bulletSprite});
    }

    setOnChangeBodyCallback(body, key, room, gameManager)
    {
        // @TODO - BETA - Refactor and extract Colyseus into a driver.
        let bodyProperties = Object.keys(body);
        let stateProps = Object.keys(body.state ?? {});
        for(let bodyProp of bodyProperties){
            body.listen(bodyProp, async (value) => {
                await this.events.emit('reldens.objectBodyChange', {body, key, changes: {[bodyProp]: value}});
                this.updateBodyProperties(bodyProp, stateProps, body, value);
                let currentScene = gameManager.activeRoomEvents.getActiveScene();
                let isBullet = -1 !== key.indexOf('bullet');
                let currentBody = isBullet ? this.bullets[key] : currentScene.objectsAnimations[key];
                let currentBodyAxleCondition = currentBody && 0 < currentBody.x || currentBody && 0 < currentBody.y;
                let axleCondition = 0 < body.x || 0 < body.y;
                let canInterpolate = GameConst.STATUS.AVOID_INTERPOLATION !== body.inState;
                this.setVisibility(currentBody, currentBodyAxleCondition, axleCondition);
                Logger.debug({key, bodyProp, value, currentBody, updatedBody: body});
                if(currentScene.clientInterpolation && canInterpolate && axleCondition && currentBodyAxleCondition){
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

    setVisibility(currentBody, currentBodyAxleCondition, axleCondition)
    {
        if(!currentBody || !currentBody.sceneSprite){
            return;
        }
        currentBody?.sceneSprite?.setVisible(axleCondition);
    }

    updateBodyProperties(bodyProp, stateProps, body, value)
    {
        if(bodyProp === 'state'){
            for(let stateProp of stateProps){
                body.state[stateProp] = value[stateProp];
            }
            return;
        }
        body[bodyProp] = value;
    }

    updateBulletBodyPosition(key, body)
    {
        if(!this.bullets[key]){
            return;
        }
        this.bullets[key].x = body.x;
        this.bullets[key].y = body.y;
        this.events.emit('reldens.objectBodyChanged', {body, key});
    }

    updateObjectsAnimations(key, body, currentScene)
    {
        let objectAnimation = sc.get(currentScene.objectsAnimations, key);
        if(!objectAnimation){
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
        let autoStartAnim = objectAnimation.autoStart === true
            ? objectAnimation.key : (
                objectAnimation.autoStart === ObjectsConst.DYNAMIC_ANIMATION ? animToPlay : objectAnimation.autoStart
            );
        objectAnimation.sceneSprite.anims.play(autoStartAnim);
        return true;
    }

    fetchAvailableAnimationKey(currentScene, objectAnimation, body)
    {
        return sc.getByPriority(currentScene.anims.anims.entries, [
            objectAnimation.key + '_' + body.dir,
            objectAnimation.layerName + '_' + objectAnimation.id + '_' + body.dir,
            objectAnimation.key
        ]) || '';
    }

    setRemoveBodyCallback(room)
    {
        // @TODO - BETA - Refactor and extract Colyseus into a driver.
        this.bodyOnRemoveCallBack = room.state.bodies.onRemove((body, key) => {
            if(-1 === key.indexOf('bullet') || !sc.hasOwn(this.bullets, key)){
                return false;
            }
            this.bullets[key].destroy();
            delete this.bullets[key];
        });
    }

    objectBattleEndAnimation(message, gameManager)
    {
        if(message.act !== ActionsConst.BATTLE_ENDED){
            return false;
        }
        // @TODO - BETA - Replace all defaults by constants.
        let deathKey = sc.get(gameManager.config.client.skills.animations, message.k + '_death', 'default_death');
        let currentScene = gameManager.activeRoomEvents.getActiveScene();
        let skeletonSprite = currentScene.physics.add.sprite(message.x, message.y, deathKey);
        skeletonSprite.setDepth(10500);
        skeletonSprite.anims.play(deathKey, true).on('animationcomplete', () => {
            skeletonSprite.destroy();
        });
        if(!sc.hasOwn(message, ActionsConst.DATA_OBJECT_KEY_TARGET)){
            return false;
        }
        if(message[ActionsConst.DATA_OBJECT_KEY_TARGET] === currentScene.player.currentTarget.id){
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

    async createDynamicAnimations(sceneDynamic)
    {
        let currentScene = sceneDynamic.gameManager.activeRoomEvents.getActiveScene();
        if(!currentScene.objectsAnimationsData){
            Logger.info('None animations defined on this scene: '+currentScene.key);
            return;
        }
        await this.events.emit('reldens.createDynamicAnimationsBefore', this, sceneDynamic);
        for(let i of Object.keys(currentScene.objectsAnimationsData)){
            let animProps = currentScene.objectsAnimationsData[i];
            await this.createAnimationFromAnimData(animProps, sceneDynamic);
        }
    }

    async createAnimationFromAnimData(animProps, sceneDynamic)
    {
        if(!animProps.key){
            Logger.error('Animation key not specified. Skipping registry.', animProps);
            return false;
        }
        animProps.frameRate = sceneDynamic.configuredFrameRate;
        await this.events.emit('reldens.createDynamicAnimation_'+animProps.key, this, animProps);
        let classDefinition = sceneDynamic.gameManager.config.getWithoutLogs(
            'client/customClasses/objects/'+animProps.key,
            AnimationEngine
        );
        let animationEngine = new classDefinition(sceneDynamic.gameManager, animProps, sceneDynamic);
        // @NOTE: this will populate the objectsAnimations property in the current scene, see scene-dynamic.
        animationEngine.createAnimation();
        return animationEngine;
    }
}

module.exports.ObjectsPlugin = ObjectsPlugin;
