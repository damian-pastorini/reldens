/**
 *
 * Reldens - ScenePreloader
 *
 * This class extends Phaser Scene to preload all the required assets, generate the UI and assign the actions.
 *
 */

const { Scene, Geom } = require('phaser');
const { MinimapUi } = require('./minimap-ui');
const { InstructionsUi } = require('./instructions-ui');
const { SettingsUi } = require('./settings-ui');
const { GameConst } = require('../constants');
const { ActionsConst } = require('../../actions/constants');
const { Logger, sc } = require('@reldens/utils');

class ScenePreloader extends Scene
{

    constructor(props)
    {
        super({key: props.name});
        this.holdTimer = null;
        this.progressBar = null;
        this.progressCompleteRect = null;
        this.progressRect = null;
        this.objectsUi = {};
        this.userInterfaces = {};
        this.preloadMapKey = props.map;
        this.preloadImages = props.images;
        this.uiScene = props.uiScene;
        this.elementsUi = {};
        this.gameManager = props.gameManager;
        this.eventsManager = props.gameManager.events;
        this.preloadAssets = props.preloadAssets;
        this.directionalAnimations = {};
        this.objectsAnimations = {};
        let currentScene = this.gameManager.activeRoomEvents.getActiveScene();
        currentScene.objectsAnimationsData = props.objectsAnimationsData;
        this.playerSpriteSize = {
            frameWidth: this.gameManager.config.get('client/players/size/width') || 52,
            frameHeight: this.gameManager.config.get('client/players/size/height') || 71
        };
    }

    preload()
    {
        // @NOTE: this event run ONLY ONE TIME for each scene.
        let eventUiScene = this.uiScene ? this : this.gameManager.gameEngine.uiScene;
        this.eventsManager.emitSync('reldens.beforePreload', this, eventUiScene);
        this.preloadUiScene();
        this.preloadMapJson();
        // @TODO - BETA - CHECK - Test a multiple tiles images case.
        this.preloadMapImages();
        this.preloadValidAssets();
        this.preloadPlayerDefaultSprite();
        this.preloadArrowPointer();
        // @TODO - BETA - Move everything related to player stats into the users pack or create a new pack.
        this.load.image(GameConst.ICON_STATS, 'assets/icons/book.png');
        this.load.on('fileprogress', this.onFileProgress, this);
        this.load.on('progress', this.onLoadProgress, this);
        this.load.on('complete', this.onLoadComplete, this);
        this.configuredFrameRate = this.gameManager.config.get('client/general/animations/frameRate') || 10;
        this.createProgressBar();
    }

    preloadMapJson()
    {
        if(!this.preloadMapKey){
            return;
        }
        this.load.tilemapTiledJSON(this.preloadMapKey, `assets/maps/${this.preloadMapKey}.json`);
    }

    preloadArrowPointer()
    {
        if(!this.gameManager.config.get('client/ui/pointer/show')){
            return;
        }
        // @TODO - BETA - Make pointer sprite data configurable.
        let pointerData = {frameWidth: 32, frameHeight: 32};
        this.load.spritesheet(GameConst.ARROW_DOWN, 'assets/sprites/arrow-down.png', pointerData);
    }

    preloadUiScene()
    {
        if(!this.uiScene){
            return;
        }
        // @NOTE: the events here run only once over all the game progress.
        this.eventsManager.emitSync('reldens.beforePreloadUiScene', this);
        if(this.gameManager.config.get('client/ui/playerBox/enabled')){
            this.load.html('playerBox', 'assets/html/ui-player-box.html');
        }
        if(this.gameManager.config.get('client/ui/controls/enabled')){
            this.load.html('controls', 'assets/html/ui-controls.html');
        }
        if(this.gameManager.config.get('client/ui/sceneLabel/enabled')){
            this.load.html('sceneLabel', 'assets/html/ui-scene-label.html');
        }
        if(this.gameManager.config.get('client/ui/instructions/enabled')){
            this.load.html('instructions', 'assets/html/ui-instructions.html');
        }
        if(this.gameManager.config.get('client/ui/minimap/enabled')){
            this.load.html('minimap', 'assets/html/ui-minimap.html');
        }
        if(this.gameManager.config.get('client/ui/settings/enabled')){
            this.load.html('settings', 'assets/html/ui-settings.html');
            this.load.html('settings-content', 'assets/html/ui-settings-content.html');
        }
        this.load.html('uiTarget', 'assets/html/ui-target.html');
        this.load.html('uiOptionButton', 'assets/html/ui-option-button.html');
        this.load.html('uiOptionIcon', 'assets/html/ui-option-icon.html');
        this.load.html('uiOptionsContainer', 'assets/html/ui-options-container.html');
        this.eventsManager.emitSync('reldens.preloadUiScene', this);
    }

    preloadMapImages()
    {
        if(!this.preloadImages){
            return;
        }
        // @NOTE: this will mostly handle the map tiles images, here we need the preloadImages and tile data because
        // the JSON map file is not loaded yet.
        let tileData = {
            frameWidth: this.gameManager.config.get('client/map/tileData/width') || 32,
            frameHeight: this.gameManager.config.get('client/map/tileData/height') || 32,
            margin: this.gameManager.config.get('client/map/tileData/margin') || 1,
            spacing: this.gameManager.config.get('client/map/tileData/spacing') || 2
        };
        let files = this.preloadImages.split(',');
        // @TODO - BETA - Remove the hardcoded file extensions.
        for(let imageFile of files){
            this.load.spritesheet(imageFile, `assets/maps/${imageFile}.png`, tileData);
        }
    }

    preloadValidAssets()
    {
        if(0 === this.preloadAssets.length){
            return;
        }
        // @TODO - BETA - Remove the hardcoded file extensions.
        for(let asset of this.preloadAssets){
            if('spritesheet' !== asset.asset_type){
                continue;
            }
            let assetParams = sc.toJson(asset.extra_params);
            if(!assetParams){
                Logger.error(['Missing spritesheet params:', asset]);
                continue;
            }
            this.load.spritesheet(asset.asset_key, `assets/custom/sprites/${asset.file_1}.png`, assetParams);
        }
    }

    create()
    {
        // @NOTE: this event run once for each scene.
        let eventUiScene = this.uiScene ? this : this.gameManager.gameEngine.uiScene;
        this.eventsManager.emitSync('reldens.createPreload', this, eventUiScene);
        if(this.uiScene){
            this.createUiScene();
        }
        // player animations:
        this.createPlayerAnimations(GameConst.IMAGE_PLAYER);
        // pathfinder arrow:
        this.createArrowAnimation();
    }

    createUiScene()
    {
        // @NOTE: the events here run only once over all the game progress.
        this.eventsManager.emitSync('reldens.beforeCreateUiScene', this);
        // @TODO - BETA - Replace all different DOM references and standardize with React.
        this.createPlayerBox();
        this.createTargetUi();
        this.createSceneLabelBox();
        this.createControlsBox();
        this.createInstructionsBox();
        this.createMiniMap();
        this.createSettingsUi();
        this.eventsManager.emitSync('reldens.createUiScene', this);
    }

    createSettingsUi()
    {
        let settingsConfig = this.getUiConfig('settings');
        if(!settingsConfig.enabled){
            return;
        }
        this.settingsUi = new SettingsUi();
        this.settingsUi.createSettings(settingsConfig, this);
    }

    createMiniMap()
    {
        let minimapConfig = this.getUiConfig('minimap');
        if(!minimapConfig.enabled){
            return;
        }
        this.minimapUi = new MinimapUi();
        this.minimapUi.createMinimap(minimapConfig, this);
    }

    createInstructionsBox()
    {
        let instConfig = this.getUiConfig('instructions');
        if(!instConfig.enabled){
            return;
        }
        this.instructionsUi = new InstructionsUi();
        this.instructionsUi.createInstructions(instConfig, this);
    }

    createControlsBox()
    {
        let controlsUi = this.getUiConfig('controls');
        if(!controlsUi.enabled){
            return;
        }
        this.elementsUi['controls'] = this.add.dom(controlsUi.uiX, controlsUi.uiY).createFromCache('controls');
        this.registerControllers(this.elementsUi['controls']);
    }

    createSceneLabelBox()
    {
        let sceneLabelUi = this.getUiConfig('sceneLabel');
        if(!sceneLabelUi.enabled){
            return;
        }
        this.elementsUi['sceneLabel'] = this.add.dom(sceneLabelUi.uiX, sceneLabelUi.uiY).createFromCache('sceneLabel');
    }

    createTargetUi()
    {
        let targetUi = this.getUiConfig('uiTarget');
        if(!targetUi.enabled){
            return;
        }
        this.uiTarget = this.add.dom(targetUi.uiX, targetUi.uiY).createFromCache('uiTarget');
        let closeButton = this.uiTarget.getChildByProperty('className', 'close-target');
        closeButton.addEventListener('click', () => {
            this.gameManager.gameEngine.clearTarget();
        });
    }

    createPlayerBox()
    {
        let playerBox = this.getUiConfig('playerBox');
        if(!playerBox.enabled){
            return;
        }
        this.elementsUi['playerBox'] = this.add.dom(playerBox.uiX, playerBox.uiY).createFromCache('playerBox');
        let logoutButton = this.elementsUi['playerBox'].getChildByProperty('id', 'logout');
        logoutButton?.addEventListener('click', () => {
            this.gameManager.forcedDisconnection = true;
            // @TODO - BETA - Move this into an event on the firebase plugin.
            if(this.gameManager.firebase.isActive){
                this.gameManager.firebase.app.auth().signOut();
            }
            this.gameManager.gameDom.getWindow().location.reload();
        });
    }

    getUiConfig(uiName, newWidth, newHeight)
    {
        let {uiX, uiY} = this.getUiPosition(uiName, newWidth, newHeight);
        return {
            enabled: this.gameManager.config.get('client/ui/'+uiName+'/enabled'),
            uiX: uiX,
            uiY: uiY
        }
    }

    getUiPosition(uiName, newWidth, newHeight)
    {
        let uiX = this.gameManager.config.get('client/ui/'+uiName+'/x');
        let uiY = this.gameManager.config.get('client/ui/'+uiName+'/y');
        if(this.gameManager.config.get('client/ui/screen/responsive')){
            let rX = this.gameManager.config.get('client/ui/'+uiName+'/responsiveX');
            let rY = this.gameManager.config.get('client/ui/'+uiName+'/responsiveY');
            if(!newWidth){
                newWidth = this.gameManager.gameDom.getElement('.game-container').offsetWidth;
            }
            if(!newHeight){
                newHeight = this.gameManager.gameDom.getElement('.game-container').offsetHeight;
            }
            uiX = rX ? rX * newWidth / 100 : 0;
            uiY = rY ? rY * newHeight / 100 : 0;
        }
        return {uiX, uiY};
    }

    preloadPlayerDefaultSprite()
    {
        let fallbackImage = this.gameManager.config.get('client/players/animations/fallbackImage') || 'player-base';
        this.load.spritesheet(
            GameConst.IMAGE_PLAYER,
            'assets/custom/sprites/'+fallbackImage+'.png',
            this.playerSpriteSize
        );
    }

    createPlayerAnimations(avatarKey)
    {
        let defaultFrames = this.gameManager.config.get('client/players/animations/defaultFrames');
        let availableAnimations = [{
                k: avatarKey + '_' + GameConst.LEFT,
                img: avatarKey,
                start: defaultFrames.left.start || 3,
                end: defaultFrames.left.end || 5,
                repeat: -1,
                hide: false
            }, {
                k: avatarKey + '_' + GameConst.RIGHT,
                img: avatarKey,
                start: defaultFrames.right.start || 6,
                end: defaultFrames.right.end || 8,
                repeat: -1,
                hide: false
            }, {
                k: avatarKey + '_' + GameConst.UP,
                img: avatarKey,
                start: defaultFrames.up.start || 9,
                end: defaultFrames.up.end || 11,
                repeat: -1,
                hide: false
            }, {
                k: avatarKey + '_' + GameConst.DOWN,
                img: avatarKey,
                start: defaultFrames.down.start || 0,
                end: defaultFrames.down.end || 2,
                repeat: -1,
                hide: false
            }
        ];
        for(let anim of availableAnimations){
            this.createAnimationWith(anim);
        }
        this.eventsManager.emitSync('reldens.createPlayerAnimations', this, avatarKey);
    }

    createArrowAnimation()
    {
        if(!this.gameManager.config.get('client/ui/pointer/show')){
            return;
        }
        let arrowAnim = {
            k: GameConst.ARROW_DOWN,
            img: GameConst.ARROW_DOWN, // this is the loaded image key
            start: 0,
            end: 2,
            repeat: 3,
            rate: 6
        };
        this.createAnimationWith(arrowAnim);
    }

    createAnimationWith(anim)
    {
        this.anims.create({
            key: anim.k,
            frames: this.anims.generateFrameNumbers(anim.img, {start: anim.start, end: anim.end}),
            frameRate: sc.hasOwn(anim, 'rate') ? anim.rate : this.configuredFrameRate,
            repeat: anim.repeat,
            hideOnComplete: sc.hasOwn(anim, 'hide') ? anim.hide : true,
        });
    }

    registerControllers(controllersBox)
    {
        // @TODO - BETA - Controllers will be part of the configuration in the database.
        this.setupDirButtonInBox(GameConst.UP, controllersBox);
        this.setupDirButtonInBox(GameConst.DOWN, controllersBox);
        this.setupDirButtonInBox(GameConst.LEFT, controllersBox);
        this.setupDirButtonInBox(GameConst.RIGHT, controllersBox);
        this.setupDefaultActionKey(controllersBox);
    }

    setupDefaultActionKey(controllersBox)
    {
        // if the default action is not specified we won't show the button:
        let defaultActionKey = this.gameManager.config.get('client/ui/controls/defaultActionKey');
        if(!defaultActionKey){
            return;
        }
        let actionBox = this.createActionBox(defaultActionKey);
        this.gameManager.gameDom.appendToElement('.action-buttons', actionBox);
        this.setupActionButtonInBox(defaultActionKey, controllersBox);
    }

    createActionBox(actionKey)
    {
        let skillTemplate = this.cache.html.get('actionBox');
        return this.gameManager.gameEngine.parseTemplate(skillTemplate, {
            key: actionKey,
            actionName: actionKey
        });
    }

    setupDirButtonInBox(dir, box)
    {
        let btn = box.getChildByProperty('id', dir);
        if(btn){
            this.hold(btn, {dir: dir});
        }
    }

    setupActionButtonInBox(action, box)
    {
        let actionButton = box.getChildByProperty('id', action);
        if(!actionButton){
            return;
        }
        if(this.gameManager.config.get('client/general/controls/action_button_hold')){
            this.hold(actionButton, action);
            return;
        }
        actionButton?.addEventListener('click', () => {
            let currentScene = this.gameManager.activeRoomEvents.getActiveScene();
            let dataSend = {
                act: ActionsConst.ACTION,
                target: currentScene.player.currentTarget,
                type: action
            };
            this.gameManager.activeRoomEvents.room.send('*', dataSend);
        });
    }

    hold(button, action)
    {
        button.addEventListener('mousedown', (event) => {
            this.startHold(event, button, action);
        });
        button.addEventListener('mouseup', (event) => {
            this.endHold(event, button);
        });
        button.addEventListener('mouseout', (event) => {
            this.endHold(event, button);
        });
        button.addEventListener('touchstart', (event) => {
            this.startHold(event, button, action);
        });
        button.addEventListener('touchend', (event) => {
            this.endHold(event, button);
        });
    }

    startHold(event, button, action)
    {
        event.preventDefault();
        if(this.gameManager.config.get('client/ui/controls/opacityEffect')){
            button.classList.add('button-opacity-off');
        }
        let currentScene = this.gameManager.activeRoomEvents.getActiveScene();
        let dataSend = action;
        // @TODO - BETA - Controllers will be part of the configuration in the database.
        if(!sc.hasOwn(action, 'dir')){
            dataSend = {
                act: ActionsConst.ACTION,
                target: currentScene.player.currentTarget,
                type: action.type
            };
        }
        this.repeatHold(dataSend);
    }

    endHold(event, button)
    {
        event.preventDefault();
        if(this.gameManager.config.get('client/ui/controls/opacityEffect')){
            button.classList.remove('button-opacity-off');
        }
        clearTimeout(this.holdTimer);
        this.gameManager.activeRoomEvents.room.send('*', {act: GameConst.STOP});
    }

    repeatHold(sendData)
    {
        this.gameManager.activeRoomEvents.room.send('*', sendData);
        this.holdTimer = setTimeout(() => {
            this.repeatHold(sendData);
        }, (this.timeout || 0));
    }

    createProgressBar()
    {
        let Rectangle = Geom.Rectangle;
        let main = Rectangle.Clone(this.cameras.main);
        this.progressRect = new Rectangle(0, 0, main.width / 2, 50);
        Rectangle.CenterOn(this.progressRect, main.centerX, main.centerY);
        this.progressCompleteRect = Geom.Rectangle.Clone(this.progressRect);
        this.progressBar = this.add.graphics();
        let width = this.cameras.main.width;
        let height = this.cameras.main.height;
        let loadingFont = this.gameManager.config.get('client/ui/loading/font');
        let loadingFontSize = this.gameManager.config.get('client/ui/loading/fontSize');
        let loadingAssetsSize = this.gameManager.config.get('client/ui/loading/assetsSize');
        this.loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
            fontFamily: loadingFont,
            fontSize: loadingFontSize
        });
        this.loadingText.setOrigin(0.5, 0.5);
        this.loadingText.setFill(this.gameManager.config.get('client/ui/loading/loadingColor'));
        this.percentText = this.add.text(width / 2, height / 2 - 5, '0%', {
            fontFamily: loadingFont,
            fontSize: loadingAssetsSize
        });
        this.percentText.setOrigin(0.5, 0.5);
        this.percentText.setFill(this.gameManager.config.get('client/ui/loading/percentColor'));
        this.assetText = this.add.text(width / 2, height / 2 + 50, '', {
            fontFamily: loadingFont,
            fontSize: loadingAssetsSize
        });
        this.assetText.setFill(this.gameManager.config.get('client/ui/loading/assetsColor'));
        this.assetText.setOrigin(0.5, 0.5);
    }

    onLoadComplete()
    {
        for(let child of this.children.list){
            child.destroy();
        }
        this.loadingText.destroy();
        this.assetText.destroy();
        this.percentText.destroy();
        this.scene.shutdown();
    }

    onFileProgress(file)
    {
        if(!this.gameManager.config.get('client/ui/loading/showAssets')){
            return;
        }
        this.assetText.setText('Loading asset: '+file.key);
    }

    onLoadProgress(progress)
    {
        let progressText = parseInt(progress * 100) + '%';
        this.percentText.setText(progressText);
        let color = (0xffffff);
        let fillColor = (0x222222);
        this.progressRect.width = progress * this.progressCompleteRect.width;
        this.progressBar
            .clear()
            .fillStyle(fillColor)
            .fillRectShape(this.progressCompleteRect)
            .fillStyle(color)
            .fillRectShape(this.progressRect);
    }

    getUiElement(uiName, logError = true)
    {
        if(sc.hasOwn(this.elementsUi, uiName)){
            return this.elementsUi[uiName];
        }
        if(logError){
            Logger.error(['UI not found:', uiName]);
        }
        return false;
    }

}

module.exports.ScenePreloader = ScenePreloader;
