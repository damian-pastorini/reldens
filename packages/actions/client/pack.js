/**
 *
 * Reldens - Actions Client Package.
 *
 */

const { ReceiverWrapper } = require('./receiver-wrapper');
const { SkillsUi } = require('./skills-ui');
const { SkillConst } = require('@reldens/skills');
const { EventsManagerSingleton, sc } = require('@reldens/utils');

class ActionsPack
{

    constructor()
    {
        EventsManagerSingleton.on('reldens.preloadUiScene', (uiScene) => {
            this.onPreloadUiScene(uiScene);
        });
        EventsManagerSingleton.on('reldens.beforeCreateEngine', (initialGameData, gameManager) => {
            let playersConfig = initialGameData.gameConfig.client.players;
            if(playersConfig.multiplePlayers && playersConfig.multiplePlayers.enabled && initialGameData.classesData){
                this.populateClassesSelector(initialGameData.classesData, gameManager, playersConfig);
            }
        });
        EventsManagerSingleton.on('reldens.playersOnAdd', (player, key, previousScene, roomEvents) => {
            this.onPlayersOnAdd(player, key, roomEvents);
        });
        EventsManagerSingleton.on('reldens.playersOnAddReady', (player, key, previousScene, roomEvents) => {
            this.onPlayersOnAddReady(player, key, roomEvents);
        });
        EventsManagerSingleton.on('reldens.createPreload', (preloadScene) => {
            let levelsAnimations = preloadScene.gameManager.config.get('client/levels/animations');
            this.loopAnimationsAnd(levelsAnimations, 'create', preloadScene);
            let skillsAnimations = preloadScene.gameManager.config.get('client/skills/animations');
            this.loopAnimationsAnd(skillsAnimations, 'create', preloadScene);
            this.createAvatarsAnimations(preloadScene);
        });
        EventsManagerSingleton.on('reldens.createUiScene', (preloadScene) => {
            this.uiManager = new SkillsUi(preloadScene);
            this.uiManager.createUi();
        });
    }

    populateClassesSelector(classesData, gameManager, playersConfig)
    {
        let playerAdditional = gameManager.gameDom.getElement('.player_creation_additional_info');
        if(playerAdditional){
            let div = gameManager.gameDom.createElement('div');
            div.id = 'class-path-selector-box';
            div.classList.add('input-box');
            let label = gameManager.gameDom.createElement('label');
            label.for = 'class-path-select';
            label.innerText = 'Select Your Class-Path';
            let select = gameManager.gameDom.createElement('select');
            select.id = 'class-path-select';
            select.name = 'class_path_select';
            for(let id of Object.keys(classesData)){
                let option = new Option(classesData[id].label, id);
                option.dataset.key = classesData[id].key;
                select.append(option);
            }
            div.append(label);
            div.append(select);
            let avatarDiv = gameManager.gameDom.createElement('div');
            avatarDiv.className = 'avatar-container';
            this.appendAvatarOnSelector(select, avatarDiv, gameManager, playersConfig);
            div.append(avatarDiv);
            playerAdditional.append(div);
        }
    }

    appendAvatarOnSelector(select, container, gameManager, playersConfig)
    {
        let avatar = gameManager.gameDom.createElement('div');
        let avatarKey = select.options[select.selectedIndex].dataset.key;
        avatar.classList.add('class-path-select-avatar');
        avatar.style.backgroundImage = `url('/assets/custom/sprites/${avatarKey}.png')`;
        avatar.style.backgroundPosition = 'top left';
        avatar.style.display = 'block';
        avatar.style.width = playersConfig.size.width+'px';
        avatar.style.height = playersConfig.size.height+'px';
        avatar.style.margin = '10px auto';
        select.addEventListener('change', () => {
            let avatarKey = select.options[select.selectedIndex].dataset.key;
            avatar.style.backgroundImage = `url('/assets/custom/sprites/${avatarKey}.png')`;
        });
        container.append(avatar);
    }

    onPlayersOnAddReady(player, key, roomEvents)
    {
        if(key !== roomEvents.room.sessionId){
            return false;
        }
        if(!roomEvents.gameManager.skills){
            // create skills receiver instance:
            roomEvents.gameManager.skills = new ReceiverWrapper({owner: player}, roomEvents);
        }
        if(!roomEvents.gameManager.skillsQueue.length){
            return false;
        }
        for(let message of roomEvents.gameManager.skillsQueue){
            // process queue messages:
            roomEvents.gameManager.skills.processMessage(message);
        }
    }

    onPlayersOnAdd(player, key, roomEvents)
    {
        if(key !== roomEvents.room.sessionId){
            return false;
        }
        // listen to room messages:
        roomEvents.room.onMessage((message) => {
            this.processOrQueueMessage(message, roomEvents.gameManager);
        });
    }

    processOrQueueMessage(message, gameManager)
    {
        if(
            message.act.indexOf(SkillConst.ACTIONS_PREF) !== 0
            && message.act.indexOf('_atk') === -1
            && message.act.indexOf('_eff') === -1
            && message.act.indexOf('_hit') === -1
        ){
            return false;
        }
        let currentScene = gameManager.getActiveScene();
        if(currentScene && currentScene.player){
            gameManager.skills.processMessage(message);
        } else {
            if(!sc.hasOwn(gameManager, 'skillsQueue')){
                gameManager.skillsQueue = [];
            }
            gameManager.skillsQueue.push(message);
        }
    }

    onPreloadUiScene(uiScene)
    {
        uiScene.load.html('skillsClassPath', 'assets/features/skills/templates/ui-class-path.html');
        uiScene.load.html('skillsLevel', 'assets/features/skills/templates/ui-level.html');
        uiScene.load.html('skillsExperience', 'assets/features/skills/templates/ui-experience.html');
        uiScene.load.html('skills', 'assets/features/skills/templates/ui-skills.html');
        uiScene.load.html('skillBox', 'assets/features/skills/templates/ui-skill-box.html');
        uiScene.load.html('actionBox', 'assets/html/ui-action-box.html');
        this.preloadClassPaths(uiScene);
        this.loopAnimationsAnd(uiScene.gameManager.config.get('client/levels/animations'), 'preload', uiScene);
        this.loopAnimationsAnd(uiScene.gameManager.config.get('client/skills/animations'), 'preload', uiScene);
    }

    preloadClassPaths(uiScene)
    {
        let classesData = sc.getDef(uiScene.gameManager.initialGameData, 'classesData', false);
        if(!classesData){
            return false;
        }
        for(let i of Object.keys(classesData)){
            let avatarKey = classesData[i].key;
            uiScene.load.spritesheet(avatarKey, 'assets/custom/sprites/'+avatarKey+'.png', uiScene.playerSpriteSize);
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
            this[command+'Animation'](data, uiScene);
        }
    }

    createAvatarsAnimations(preloadScene)
    {
        let classesData = sc.getDef(preloadScene.gameManager.initialGameData, 'classesData', false);
        if(!classesData){
            return false;
        }
        for(let i of Object.keys(classesData)){
            let avatarKey = classesData[i].key;
            preloadScene.createPlayerAnimations(avatarKey);
        }
    }

    preloadAnimation(data, uiScene)
    {
        // @TODO - BETA - Remove the hardcoded file extensions.
        // @NOTE: here we use have two keys, the animation key and the animationData.img, this is because we could have
        // a single sprite with multiple attacks, and use the start and end frame to run the required one.
        if(sc.hasOwn(data.animationData, ['type', 'img']) && data.animationData.type === 'spritesheet'){
            // try load directions:
            // - 1: both (this is to include diagonals)
            // - 2: up/down
            // - 3: left/right
            let animDir = sc.getDef(data.animationData, 'dir', 0);
            if(animDir > 0){
                // @TODO - BETA - Refactor and implement animDir = 1 (both): up_right, up_left, down_right,
                //   down_left.
                if(animDir === 1 || animDir === 2){
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
                if(animDir === 1 || animDir === 3){
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
            key: imageKey,
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
