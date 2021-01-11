/**
 *
 * Reldens - Actions Client Package.
 *
 */

const { ReceiverWrapper } = require('./receiver-wrapper');
const { SkillsUi } = require('./skills-ui');
const { EventsManagerSingleton, sc } = require('@reldens/utils');

class ActionsPack
{

    constructor()
    {
        EventsManagerSingleton.on('reldens.playersOnAdd', (player, key, previousScene, roomEvents) => {
            if(key === roomEvents.room.sessionId){
                if(!roomEvents.gameManager.skills){
                    // create skills instance only once:
                    let receiverProps = {
                        owner: player
                    };
                    // @TODO - BETA.17 - Refactor and use a wrapper.
                    player.getPosition = () => {
                        return {
                            x: this.state.x,
                            y: this.state.y
                        };
                    };
                    // create skills receiver instance:
                    roomEvents.gameManager.skills = new ReceiverWrapper(receiverProps, roomEvents);
                }
                // listen to room messages:
                roomEvents.room.onMessage((message) => {
                    roomEvents.gameManager.skills.processMessage(message);
                });
            }
        });
        EventsManagerSingleton.on('reldens.playersOnAddReady', (player, key, previousScene, roomEvents) => {
            if(key === roomEvents.room.sessionId){
                if(roomEvents.gameManager.skills.queueMessages.length){
                    for(let message of roomEvents.gameManager.skills.queueMessages){
                        // process queue messages:
                        roomEvents.gameManager.skills.processMessage(message);
                    }
                }
            }
        });
        EventsManagerSingleton.on('reldens.preloadUiScene', (uiScene) => {
            uiScene.load.html('skillsClassPath', 'assets/features/skills/templates/ui-class-path.html');
            uiScene.load.html('skillsLevel', 'assets/features/skills/templates/ui-level.html');
            uiScene.load.html('skillsExperience', 'assets/features/skills/templates/ui-experience.html');
            uiScene.load.html('skills', 'assets/features/skills/templates/ui-skills.html');
            uiScene.load.html('skillBox', 'assets/features/skills/templates/ui-skill-box.html');
            uiScene.load.html('actionBox', 'assets/html/ui-action-box.html');
            this.loopSkillsAnd('preload', uiScene);
        });
        EventsManagerSingleton.on('reldens.createPreload', (preloadScene) => {
            this.loopSkillsAnd('create', preloadScene);
        });
        EventsManagerSingleton.on('reldens.createUiScene', (preloadScene) => {
            this.uiManager = new SkillsUi(preloadScene);
            this.uiManager.createUi();
        });
    }

    loopSkillsAnd(command, uiScene)
    {
        // preload defaults:
        let animations = uiScene.gameManager.config.get('client/skills/animations');
        if(animations){
            for(let i of Object.keys(animations)){
                let data = animations[i];
                if(!data.animationData.enabled){
                    continue;
                }
                this[command+'Animation'](data, uiScene);
            }
        }
    }

    preloadAnimation(data, uiScene)
    {
        // @TODO - BETA.17 - Remove the hardcoded file extensions.
        // @NOTE: here we use have two keys, the animation key and the animationData.img, this is because we could have
        // a single sprite with multiple attacks, and use the start and end frame to run the required one.
        if(sc.hasOwn(data.animationData, ['type', 'img']) && data.animationData.type === 'spritesheet'){
            // try load directions:
            // - 1: both (this is to include diagonals)
            // - 2: up/down
            // - 3: left/right
            let animDir = sc.getDef(data.animationData, 'dir', 0);
            if(animDir > 0){
                // @TODO - BETA.17 - Refactor and implement animDir = 1 (both): up_right, up_left, down_right,
                //   down_left.
                if(animDir === 2){
                    uiScene.load.spritesheet(
                        this.getAnimationKey(data, 'up'),
                        'assets/custom/actions/sprites/'+data.animationData.img+'_up.png',
                        data.animationData
                    );
                    uiScene.load.spritesheet(
                        this.getAnimationKey(data, 'down'),
                        'assets/custom/actions/sprites/'+data.animationData.img+'_down.png',
                        data.animationData
                    );
                }
                if(animDir === 3){
                    uiScene.load.spritesheet(
                        this.getAnimationKey(data, 'left'),
                        'assets/custom/actions/sprites/'+data.animationData.img+'_left.png',
                        data.animationData
                    );
                    uiScene.load.spritesheet(
                        this.getAnimationKey(data, 'right'),
                        'assets/custom/actions/sprites/'+data.animationData.img+'_right.png',
                        data.animationData
                    );
                }
            } else {
                uiScene.load.spritesheet(
                    this.getAnimationKey(data),
                    'assets/custom/actions/sprites/'+data.animationData.img+'.png',
                    data.animationData
                );
            }
        }
        if(data.classKey && typeof data.classKey.prepareAnimation === 'function'){
            data.classKey.prepareAnimation({data, uiScene, pack: this});
        }
    }

    createAnimation(data, uiScene)
    {
        if(sc.hasOwn(data.animationData, ['type', 'img']) && data.animationData.type === 'spritesheet'){
            let animDir = sc.getDef(data.animationData, 'dir', 0);
            if(animDir > 0){
                // @TODO - BETA.17 - Refactor and implement animDir = 1 (both): up_right, up_left, down_right,
                //   down_left.
                uiScene.directionalAnimations[this.getAnimationKey(data)] = data.animationData.dir;
                if(animDir === 2){
                    this.createWithDirection(data, uiScene, 'up');
                    this.createWithDirection(data, uiScene, 'down');
                }
                if(animDir === 3){
                    this.createWithDirection(data, uiScene, 'left');
                    this.createWithDirection(data, uiScene, 'right');
                }
            } else {
                this.createWithDirection(data, uiScene);
            }
        }
        if(data.classKey && typeof data.classKey.createAnimation === 'function'){
            data.classKey.createAnimation({data, uiScene, pack: this});
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
            key: this.getAnimationKey(data, direction),
            frames: uiScene.anims.generateFrameNumbers(imageKey, data.animationData),
            hideOnComplete: sc.getDef(data.animationData, 'hide', true),
        };
        if(sc.hasOwn(data.animationData, 'duration')){
            animationCreateData.duration = data.animationData.duration;
        } else {
            animationCreateData.frameRate = sc.getDef(data.animationData, 'rate', uiScene.configuredFrameRate);
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

module.exports.ActionsPack = ActionsPack;
