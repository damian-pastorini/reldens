/**
 *
 * Reldens - PreloaderHandler.
 *
 * Main functionalities:
 * The PreloaderHandler class is responsible for handling the preloading and creation of animations and assets used in
 * the game. It loads HTML templates, spritesheets, and creates animations based on the configuration data provided by
 * the game manager. It also handles the preparation and creation of animations with multiple directions and the
 * creation of avatars animations.
 *
 * Methods:
 * - constructor(props): initializes the class with the game manager and events manager objects, and sets the
 * properties.
 * - setProperties(props): sets the properties of the class, such as the game DOM, initial game data, and animations
 * configuration.
 * - loadContents(uiScene): loads HTML templates and preloads animations based on the configuration data.
 * - preloadClassPaths(uiScene): preloads spritesheets for class paths based on the initial game data.
 * - createAnimations(preloadScene): creates animations based on the configuration data.
 * - createAvatarsAnimations(preloadScene): creates animations for avatars based on the initial game data.
 * - loopAnimationsAnd(animations, command, uiScene): loops through the animations and executes the specified command
 * (preload or create) for each animation.
 * - preloadAnimation(data, uiScene): preloads animations based on the configuration data, including animations with
 * multiple directions.
 * - preloadAnimationsInDirections(data, uiScene): preloads animations in different directions based on the
 * configuration data.
 * - preloadSpriteInDirection(uiScene, data, direction): preloads a sprite in a specific direction based on the
 * configuration data.
 * - createAnimation(data, uiScene): creates animations based on the configuration data, including animations with
 * multiple directions.
 * - createWithMultipleDirections(uiScene, data, animDir): creates animations with multiple directions based on the
 * configuration data.
 * - createWithDirection(data, uiScene, direction = false): creates animations in a specific direction based on the
 * configuration data.
 * - prepareAnimationData(data, uiScene, direction = false): prepares the animation data based on the configuration
 * data and direction.
 * - getAnimationKey(data, direction = false): gets the animation key based on the configuration data and direction.
 *
 * Fields:
 * - gameManager: the game manager object.
 * - events: the events manager object.
 * - gameDom: the game DOM object.
 * - initialGameData: the initial game data object.
 * - levelsAnimConfig: the levels animations configuration object.
 * - skillsAnimConfig: the skills animations configuration object.
 * - assetsCustomActionsSpritesPath: the path to the custom actions sprites assets.
 *
 */

const { Logger, sc } = require('@reldens/utils');
const { GameConst } = require('../../game/constants');

class PreloaderHandler
{

    constructor(props)
    {
        this.gameManager = sc.get(props, 'gameManager', false);
        if(!this.gameManager){
            Logger.error('Game Manager undefined in ActionsPlugin PreloaderHandler.');
        }
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in ActionsPlugin PreloaderHandler.');
        }
        this.setProperties(props);
    }

    setProperties(props)
    {
        if(!this.gameManager){
            return false;
        }
        this.gameDom = this.gameManager.gameDom;
        this.initialGameData = this.gameManager.initialGameData;
        this.levelsAnimConfig = this.gameManager.config.get('client/levels/animations');
        this.skillsAnimConfig = this.gameManager.config.get('client/skills/animations');
        this.assetsCustomActionsSpritesPath = sc.get(
            props,
            'assetsCustomActionsSpritesPath',
            'assets/custom/actions/sprites/'
        );
    }

    loadContents(uiScene)
    {
        uiScene.load.html('skillsClassPath', '/assets/features/skills/templates/ui-class-path.html');
        uiScene.load.html('skillsLevel', '/assets/features/skills/templates/ui-level.html');
        uiScene.load.html('skillsExperience', '/assets/features/skills/templates/ui-experience.html');
        uiScene.load.html('skills', '/assets/features/skills/templates/ui-skills.html');
        uiScene.load.html('skillBox', '/assets/features/skills/templates/ui-skill-box.html');
        uiScene.load.html('actionBox', '/assets/html/ui-action-box.html');
        this.preloadClassPaths(uiScene);
        this.loopAnimationsAnd(this.levelsAnimConfig, 'preload', uiScene);
        this.loopAnimationsAnd(this.skillsAnimConfig, 'preload', uiScene);
    }

    preloadClassPaths(uiScene)
    {
        let classesData = sc.get(this.initialGameData, 'classesData', false);
        if(!classesData){
            return false;
        }
        for(let i of Object.keys(classesData)){
            let avatarKey = classesData[i].key;
            uiScene.load.spritesheet(
                avatarKey,
                '/assets/custom/sprites/'+avatarKey+GameConst.FILES.EXTENSIONS.PNG,
                uiScene.playerSpriteSize
            );
        }
    }

    createAnimations(preloadScene)
    {
        let levelsAnimations = this.levelsAnimConfig;
        this.loopAnimationsAnd(levelsAnimations, 'create', preloadScene);
        let skillsAnimations = this.skillsAnimConfig;
        this.loopAnimationsAnd(skillsAnimations, 'create', preloadScene);
        this.createAvatarsAnimations(preloadScene);
    }

    createAvatarsAnimations(preloadScene)
    {
        let classesData = sc.get(this.initialGameData, 'classesData', false);
        if(!classesData){
            return false;
        }
        for(let i of Object.keys(classesData)){
            let avatarKey = classesData[i].key;
            preloadScene.createPlayerAnimations(avatarKey);
        }
    }

    loopAnimationsAnd(animations, command, uiScene)
    {
        if(!animations){
            return false;
        }
        for(let i of Object.keys(animations)){
            let data = animations[i];
            if(!data.animationData.enabled){
                continue;
            }
            // preloadAnimation or createAnimation
            this[command+'Animation'](data, uiScene);
        }
    }

    // @NOTE: dynamically named used method, see loopAnimationsAnd(animations, command, uiScene) method.
    preloadAnimation(data, uiScene)
    {
        // @TODO - BETA - Remove the hardcoded file extensions.
        // @NOTE: here we use have two keys, the animation key and the animationData.img, this is because we could have
        // a single sprite with multiple attacks, and use the start and end frame to run the required one.
        if(
            sc.hasOwn(data.animationData, ['type', 'img'])
            && GameConst.ANIMATIONS_TYPE.SPRITESHEET === data.animationData.type
        ){
            this.preloadAnimationsInDirections(data, uiScene);
        }
        if(data.classKey && sc.isFunction(data.classKey['prepareAnimation'])){
            data.classKey['prepareAnimation']({data, uiScene, pack: this});
        }
    }

    preloadAnimationsInDirections(data, uiScene)
    {
        // try load directions:
        // - 1: both (this is to include diagonals)
        // - 2: up/down
        // - 3: left/right
        let animDir = sc.get(data.animationData, 'dir', 0);
        if(0 === animDir){
            uiScene.load.spritesheet(
                this.getAnimationKey(data),
                this.assetsCustomActionsSpritesPath + data.animationData.img+GameConst.FILES.EXTENSIONS.PNG,
                data.animationData
            );
            return;
        }
        // @TODO - BETA - Refactor and implement animDir = 1 (both): up_right, up_left, down_right, down_left.
        if(1 === animDir || 2 === animDir){
            this.preloadSpriteInDirection(uiScene, data, GameConst.UP);
            this.preloadSpriteInDirection(uiScene, data, GameConst.DOWN);
        }
        if(1 === animDir || 3 === animDir){
            this.preloadSpriteInDirection(uiScene, data, GameConst.LEFT);
            this.preloadSpriteInDirection(uiScene, data, GameConst.RIGHT);
        }
    }

    preloadSpriteInDirection(uiScene, data, direction)
    {
        uiScene.load.spritesheet(
            this.getAnimationKey(data, direction),
            this.assetsCustomActionsSpritesPath+data.animationData.img+'_'+direction+GameConst.FILES.EXTENSIONS.PNG,
            data.animationData
        );
    }

    createAnimation(data, uiScene)
    {
        if(
            sc.hasOwn(data.animationData, ['type', 'img'])
            && data.animationData.type === GameConst.ANIMATIONS_TYPE.SPRITESHEET
        ){
            let animDir = sc.get(data.animationData, 'dir', 0);
            0 < animDir
                ? this.createWithMultipleDirections(uiScene, data, animDir)
                : this.createWithDirection(data, uiScene);
        }
        if(data.classKey && sc.isFunction(data.classKey['createAnimation'])){
            data.classKey['createAnimation']({data, uiScene, pack: this});
        }
    }

    createWithMultipleDirections(uiScene, data, animDir) {
        // @TODO - BETA - Refactor and implement animDir = 1 (both): up_right, up_left, down_right,
        //   down_left.
        uiScene.directionalAnimations[this.getAnimationKey(data)] = data.animationData.dir;
        if(1 === animDir || 2 === animDir){
            this.createWithDirection(data, uiScene, GameConst.UP);
            this.createWithDirection(data, uiScene, GameConst.DOWN);
        }
        if(1 === animDir || 3 === animDir){
            this.createWithDirection(data, uiScene, GameConst.LEFT);
            this.createWithDirection(data, uiScene, GameConst.RIGHT);
        }
    }

    createWithDirection(data, uiScene, direction = false)
    {
        let animationCreateData = this.prepareAnimationData(data, uiScene, direction);
        let animation = uiScene.anims.create(animationCreateData);
        if(sc.hasOwn(data.animationData, 'destroyTime')){
            animation.destroyTime = data.animationData.destroyTime;
        }
        if(sc.hasOwn(data.animationData, 'depthByPlayer')){
            animation.depthByPlayer = data.animationData.depthByPlayer;
        }
    }

    prepareAnimationData(data, uiScene, direction = false)
    {
        // @NOTE: here we use have two keys, the animation key and the animationData.img, this is because we could have
        // a single sprite with multiple attacks, and use the start and end frame to run the required one.
        let imageKey = this.getAnimationKey(data, direction);
        let animationCreateData = {
            key: imageKey,
            frames: uiScene.anims.generateFrameNumbers(imageKey, data.animationData),
            hideOnComplete: sc.get(data.animationData, 'hide', true),
        };
        if(sc.hasOwn(data.animationData, 'duration')){
            animationCreateData.duration = data.animationData.duration;
        } else {
            animationCreateData.frameRate = sc.get(data.animationData, 'rate', uiScene.configuredFrameRate);
        }
        if(sc.hasOwn(data.animationData, 'repeat')){
            animationCreateData.repeat = data.animationData.repeat;
        }
        return animationCreateData;
    }

    getAnimationKey(data, direction = false)
    {
        return (data.skillKey ? data.skillKey+'_' : '')+data.key+(direction ? '_'+direction : '');
    }

}

module.exports.PreloaderHandler = PreloaderHandler;