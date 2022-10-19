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

    loadContents(uiScene)
    {
        uiScene.sceneDriver.loadHTML('skillsClassPath', 'assets/features/skills/templates/ui-class-path.html');
        uiScene.sceneDriver.loadHTML('skillsLevel', 'assets/features/skills/templates/ui-level.html');
        uiScene.sceneDriver.loadHTML('skillsExperience', 'assets/features/skills/templates/ui-experience.html');
        uiScene.sceneDriver.loadHTML('skills', 'assets/features/skills/templates/ui-skills.html');
        uiScene.sceneDriver.loadHTML('skillBox', 'assets/features/skills/templates/ui-skill-box.html');
        uiScene.sceneDriver.loadHTML('actionBox', 'assets/html/ui-action-box.html');
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
            uiScene.sceneDriver.loadSpritesheet(avatarKey, 'assets/custom/sprites/'+avatarKey+'.png', uiScene.playerSpriteSize);
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
        if(sc.hasOwn(data.animationData, ['type', 'img']) && 'spritesheet' === data.animationData.type){
            this.preloadAnimationsInDirections(data, uiScene);
        }
        if(data.classKey && sc.isFunction(data.classKey, 'prepareAnimation')){
            data.classKey.prepareAnimation({data, uiScene, pack: this});
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
            uiScene.sceneDriver.loadSpritesheet(
                this.getAnimationKey(data),
                this.assetsCustomActionsSpritesPath + data.animationData.img + '.png',
                data.animationData
            );
            return;
        }
        // @TODO - BETA - Refactor and implement animDir = 1 (both): up_right, up_left, down_right, down_left.
        if(1 === animDir || 2 === animDir){
            this.preloadSpriteInDirection(uiScene, data, 'up');
            this.preloadSpriteInDirection(uiScene, data, 'down');
        }
        if(1 === animDir || 3 === animDir){
            this.preloadSpriteInDirection(uiScene, data, 'left');
            this.preloadSpriteInDirection(uiScene, data, 'right');
        }
    }

    preloadSpriteInDirection(uiScene, data, direction)
    {
        uiScene.sceneDriver.loadSpritesheet(
            this.getAnimationKey(data, direction),
            this.assetsCustomActionsSpritesPath+data.animationData.img+'_'+direction+'.png',
            data.animationData
        );
    }

    createAnimation(data, uiScene)
    {
        if(sc.hasOwn(data.animationData, ['type', 'img']) && data.animationData.type === 'spritesheet'){
            let animDir = sc.get(data.animationData, 'dir', 0);
            if(0 < animDir){
                // @TODO - BETA - Refactor and implement animDir = 1 (both): up_right, up_left, down_right,
                //   down_left.
                uiScene.directionalAnimations[this.getAnimationKey(data)] = data.animationData.dir;
                if(animDir === 1 || animDir === 2){
                    this.createWithDirection(data, uiScene, 'up');
                    this.createWithDirection(data, uiScene, 'down');
                }
                if(animDir === 1 || animDir === 3){
                    this.createWithDirection(data, uiScene, 'left');
                    this.createWithDirection(data, uiScene, 'right');
                }
            } else {
                this.createWithDirection(data, uiScene);
            }
        }
        if(data.classKey && sc.isFunction(data.classKey, 'createAnimation')){
            data.classKey.createAnimation({data, uiScene, pack: this});
        }
    }

    createWithDirection(data, uiScene, direction = false)
    {
        let animationCreateData = this.prepareAnimationData(data, uiScene, direction);
        let animation = uiScene.getSceneDriver().createAnimation(animationCreateData);
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
            frames: uiScene.getSceneDriver().generateAnimationFrameNumbers(imageKey, data.animationData),
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