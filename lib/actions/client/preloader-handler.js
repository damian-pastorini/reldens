/**
 *
 * Reldens - PreloaderHandler.
 *
 */

const { Logger, sc } = require('@reldens/utils');

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

    loadContents(uiSceneDriver, playerSpriteSize)
    {
        uiSceneDriver.loadHTML('skillsClassPath', 'assets/features/skills/templates/ui-class-path.html');
        uiSceneDriver.loadHTML('skillsLevel', 'assets/features/skills/templates/ui-level.html');
        uiSceneDriver.loadHTML('skillsExperience', 'assets/features/skills/templates/ui-experience.html');
        uiSceneDriver.loadHTML('skills', 'assets/features/skills/templates/ui-skills.html');
        uiSceneDriver.loadHTML('skillBox', 'assets/features/skills/templates/ui-skill-box.html');
        uiSceneDriver.loadHTML('actionBox', 'assets/html/ui-action-box.html');
        this.preloadClassPaths(uiSceneDriver, playerSpriteSize);
        this.loopAnimationsAnd(this.levelsAnimConfig, 'preload', uiSceneDriver);
        this.loopAnimationsAnd(this.skillsAnimConfig, 'preload', uiSceneDriver);
    }

    preloadClassPaths(uiSceneDriver, playerSpriteSize)
    {
        let classesData = sc.get(this.initialGameData, 'classesData', false);
        if(!classesData){
            return false;
        }
        for(let i of Object.keys(classesData)){
            let avatarKey = classesData[i].key;
            uiSceneDriver.loadSpritesheet(avatarKey, 'assets/custom/sprites/'+avatarKey+'.png', playerSpriteSize);
        }
    }

    createAnimations(scenePreloader)
    {
        let levelsAnimations = this.levelsAnimConfig;
        this.loopAnimationsAnd(levelsAnimations, 'create', scenePreloader.sceneDriver, scenePreloader.configuredFrameRate);
        let skillsAnimations = this.skillsAnimConfig;
        this.loopAnimationsAnd(skillsAnimations, 'create', scenePreloader.sceneDriver, scenePreloader.configuredFrameRate);
        this.createAvatarsAnimations(scenePreloader);
    }

    createAvatarsAnimations(scenePreloader)
    {
        let classesData = sc.get(this.initialGameData, 'classesData', false);
        if(!classesData){
            return false;
        }
        for(let i of Object.keys(classesData)){
            let avatarKey = classesData[i].key;
            scenePreloader.createPlayerAnimations(avatarKey);
        }
    }

    loopAnimationsAnd(animations, command, sceneDriver, frameRate)
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
            this[command+'Animation'](data, sceneDriver, frameRate);
        }
    }

    // @NOTE: dynamically named used method, see loopAnimationsAnd(animations, command, uiScene) method.
    preloadAnimation(data, sceneDriver)
    {
        // @TODO - BETA - Remove the hardcoded file extensions.
        // @NOTE: here we use have two keys, the animation key and the animationData.img, this is because we could have
        // a single sprite with multiple attacks, and use the start and end frame to run the required one.
        if(sc.hasOwn(data.animationData, ['type', 'img']) && 'spritesheet' === data.animationData.type){
            this.preloadAnimationsInDirections(data, sceneDriver);
        }
        if(data.classKey && sc.isFunction(data.classKey, 'prepareAnimation')){
            data.classKey.prepareAnimation({data, uiScene: sceneDriver, pack: this});
        }
    }

    preloadAnimationsInDirections(data, sceneDriver)
    {
        // try load directions:
        // - 1: both (this is to include diagonals)
        // - 2: up/down
        // - 3: left/right
        let animDir = sc.get(data.animationData, 'dir', 0);
        if(0 === animDir){
            sceneDriver.loadSpritesheet(
                this.getAnimationKey(data),
                this.assetsCustomActionsSpritesPath + data.animationData.img + '.png',
                data.animationData
            );
            return;
        }
        // @TODO - BETA - Refactor and implement animDir = 1 (both): up_right, up_left, down_right, down_left.
        if(1 === animDir || 2 === animDir){
            this.preloadSpriteInDirection(sceneDriver, data, 'up');
            this.preloadSpriteInDirection(sceneDriver, data, 'down');
        }
        if(1 === animDir || 3 === animDir){
            this.preloadSpriteInDirection(sceneDriver, data, 'left');
            this.preloadSpriteInDirection(sceneDriver, data, 'right');
        }
    }

    preloadSpriteInDirection(sceneDriver, data, direction)
    {
        sceneDriver.loadSpritesheet(
            this.getAnimationKey(data, direction),
            this.assetsCustomActionsSpritesPath+data.animationData.img+'_'+direction+'.png',
            data.animationData
        );
    }

    createAnimation(data, sceneDriver, frameRate)
    {
        if(sc.hasOwn(data.animationData, ['type', 'img']) && data.animationData.type === 'spritesheet'){
            let animDir = sc.get(data.animationData, 'dir', 0);
            if(0 < animDir){
                // @TODO - BETA - Refactor and implement animDir = 1 (both): up_right, up_left, down_right,
                //   down_left.
                sceneDriver.directionalAnimations[this.getAnimationKey(data)] = data.animationData.dir;
                if(animDir === 1 || animDir === 2){
                    this.createWithDirection(data, sceneDriver, 'up', frameRate);
                    this.createWithDirection(data, sceneDriver, 'down', frameRate);
                }
                if(animDir === 1 || animDir === 3){
                    this.createWithDirection(data, sceneDriver, 'left', frameRate);
                    this.createWithDirection(data, sceneDriver, 'right', frameRate);
                }
            } else {
                this.createWithDirection(data, sceneDriver, false, frameRate);
            }
        }
        if(data.classKey && sc.isFunction(data.classKey, 'createAnimation')){
            data.classKey.createAnimation({data, uiScene: sceneDriver, pack: this});
        }
    }

    createWithDirection(data, sceneDriver, direction = false, frameRate)
    {
        let animationCreateData = this.prepareAnimationData(data, sceneDriver, direction, frameRate);
        let animation = sceneDriver.createAnimation(animationCreateData);
        if(sc.hasOwn(data.animationData, 'destroyTime')){
            animation.destroyTime = data.animationData.destroyTime;
        }
        if(sc.hasOwn(data.animationData, 'depthByPlayer')){
            animation.depthByPlayer = data.animationData.depthByPlayer;
        }
    }

    prepareAnimationData(data, sceneDriver, direction = false, frameRate)
    {
        // @NOTE: here we use have two keys, the animation key and the animationData.img, this is because we could have
        // a single sprite with multiple attacks, and use the start and end frame to run the required one.
        let imageKey = this.getAnimationKey(data, direction);
        let animationCreateData = {
            key: imageKey,
            frames: sceneDriver.generateAnimationFrameNumbers(imageKey, data.animationData),
            hideOnComplete: sc.get(data.animationData, 'hide', true),
        };
        if(sc.hasOwn(data.animationData, 'duration')){
            animationCreateData.duration = data.animationData.duration;
        } else {
            animationCreateData.frameRate = sc.get(data.animationData, 'rate', frameRate);
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