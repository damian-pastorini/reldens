/**
 *
 * Reldens - ScenePreloader
 *
 * This class extends Phaser Scene to preload all the required assets, generate the UI and assign the actions.
 *
 */

const { Scene, Geom } = require('phaser');
const { Logger, EventsManager } = require('@reldens/utils');
const { GameConst } = require('../constants');

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
        this.preloaderName = props.name;
        this.preloadMapKey = props.map;
        this.preloadImages = props.images;
        this.uiScene = props.uiScene;
        this.gameManager = props.gameManager;
        this.preloadAssets = props.preloadAssets;
        let currentScene = this.gameManager.activeRoomEvents.getActiveScene();
        currentScene.objectsAnimationsData = props.objectsAnimationsData;
    }

    preload()
    {
        // @NOTE: this event run once for each scene.
        let eventUiScene = this.uiScene ? this : this.gameManager.gameEngine.uiScene;
        EventsManager.emit('reldens.beforePreload', this, eventUiScene);
        if(this.uiScene){
            // @NOTE: the events here run only once over all the game progress.
            EventsManager.emit('reldens.beforePreloadUiScene', this);
            // ui elements:
            if(this.gameManager.config.get('client/ui/playerName/enabled')){
                this.load.html('uiPlayer', 'assets/html/ui-player.html');
            }
            if(this.gameManager.config.get('client/ui/controls/enabled')){
                this.load.html('uiControls', 'assets/html/ui-controls.html');
            }
            if(this.gameManager.config.get('client/ui/sceneLabel/enabled')){
                this.load.html('uiSceneLabel', 'assets/html/ui-scene-label.html');
            }
            if(this.gameManager.config.get('client/ui/playerStats/enabled')){
                this.load.html('uiPlayerStats', 'assets/html/ui-player-stats.html');
                this.load.html('playerStats', 'assets/html/player-stats.html');
            }
            this.load.html('uiTarget', 'assets/html/ui-target.html');
            this.load.html('uiButton', 'assets/html/ui-button.html');
            this.load.html('uiOptionsContainer', 'assets/html/ui-options-container.html');
            EventsManager.emit('reldens.preloadUiScene', this);
        }
        // maps:
        if(this.preloadMapKey){
            this.load.tilemapTiledJSON(this.preloadMapKey, `assets/maps/${this.preloadMapKey}.json`);
        }
        // @TODO: test a multiple tiles images case.
        // map tiles images:
        if(this.preloadImages){
            // @NOTE: we need the preloadImages and tile data here because the JSON map file is not loaded yet.
            let tileData = {
                frameWidth: this.gameManager.config.get('client/general/tileData/width') || 16,
                frameHeight: this.gameManager.config.get('client/general/tileData/height') || 16,
                margin: this.gameManager.config.get('client/general/tileData/margin') || 1,
                spacing: this.gameManager.config.get('client/general/tileData/spacing') || 2
            };
            let files = this.preloadImages.split(',');
            for(let imageFile of files){
                let filePath = `assets/maps/${imageFile}.png`;
                this.load.spritesheet(imageFile, filePath, tileData);
            }
        }
        // preload objects assets:
        if(this.preloadAssets){
            for(let asset of this.preloadAssets){
                if(asset.asset_type === 'spritesheet'){
                    let assetFilePath = `assets/custom/sprites/${asset.file_1}.png`;
                    let assetParams = asset.extra_params ? JSON.parse(asset.extra_params) : false;
                    if(assetParams){
                        this.load.spritesheet(asset.asset_key, assetFilePath, assetParams);
                    } else {
                        Logger.error(['Missing spritesheet params:', asset]);
                    }
                }
            }
        }
        let playerSpriteSize = {
            frameWidth: this.gameManager.config.get('client/players/size/width') || 52,
            frameHeight: this.gameManager.config.get('client/players/size/height') || 71
        };
        // @TODO: implement player custom avatar.
        // this.load.spritesheet(this.username, 'assets/sprites/'+this.username+'.png', playerSpriteSize);
        this.load.spritesheet(GameConst.IMAGE_PLAYER, 'assets/sprites/player-1.png', playerSpriteSize);
        // @TODO: make all these configurable from the storage.
        this.load.spritesheet(GameConst.ATTACK, 'assets/sprites/weapons-1.png', {frameWidth: 64, frameHeight: 64});
        this.load.spritesheet(GameConst.HIT, 'assets/sprites/impact-1.png', {frameWidth: 64, frameHeight: 64});
        this.load.spritesheet(GameConst.DEATH, 'assets/sprites/object-1.png', {frameWidth: 64, frameHeight: 64});
        this.load.spritesheet(GameConst.BULLET, 'assets/sprites/earth-1.png', {frameWidth: 64, frameHeight: 64});
        if(this.gameManager.config.get('client/ui/pointer/show')){
            let pointerData = {frameWidth: 32, frameHeight: 32};
            this.load.spritesheet(GameConst.ARROW_DOWN, 'assets/sprites/arrow-w-down.png', pointerData);
        }
        // interface assets:
        this.load.image(GameConst.ICON_STATS, 'assets/icons/book.png');
        this.load.on('fileprogress', this.onFileProgress, this);
        this.load.on('progress', this.onLoadProgress, this);
        this.load.on('complete', this.onLoadComplete, this);
        this.configuredFrameRate = this.gameManager.config.get('client/general/animations/frameRate') || 10;
        this.createProgressBar();
    }

    create()
    {
        // @NOTE: this event run once for each scene.
        let eventUiScene = this.uiScene ? this : this.gameManager.gameEngine.uiScene;
        EventsManager.emit('reldens.createPreload', this, eventUiScene);
        if(this.uiScene){
            // @NOTE: the events here run only once over all the game progress.
            EventsManager.emit('reldens.beforeCreateUiScene', this);
            // create ui:
            let playerUi = this.getUiConfig('playerName');
            if(playerUi.enabled){
                this.uiPlayer = this.add.dom(playerUi.uiX, playerUi.uiY).createFromCache('uiPlayer');
                // logout:
                let logoutButton = this.uiPlayer.getChildByProperty('id', 'logout');
                logoutButton.addEventListener('click', () => {
                    window.location.reload();
                });
            }
            let targetUi = this.getUiConfig('uiTarget');
            if(targetUi.enabled){
                this.uiTarget = this.add.dom(targetUi.uiX, targetUi.uiY).createFromCache('uiTarget');
                let closeButton = this.uiTarget.getChildByProperty('className', 'close-target');
                closeButton.addEventListener('click', () => {
                    this.gameManager.gameEngine.clearTarget();
                });
            }
            let sceneLabelUi = this.getUiConfig('sceneLabel');
            if(sceneLabelUi.enabled){
                this.uiSceneLabel = this.add.dom(sceneLabelUi.uiX, sceneLabelUi.uiY).createFromCache('uiSceneLabel');
            }
            let controlsUi = this.getUiConfig('controls');
            if(controlsUi.enabled){
                this.uiControls = this.add.dom(controlsUi.uiX, controlsUi.uiY).createFromCache('uiControls');
                this.registerControllers(this.uiControls);
            }
            let statsUi = this.getUiConfig('playerStats');
            if(statsUi.enabled){
                this.uiPlayerStats = this.add.dom(statsUi.uiX, statsUi.uiY).createFromCache('uiPlayerStats');
                let statsBox = this.uiPlayerStats.getChildByProperty('id', 'box-player-stats');
                let statsButton = this.uiPlayerStats.getChildByProperty('id', 'player-stats-btn');
                let statsPanel = this.uiPlayerStats.getChildByProperty('id', 'player-stats-container');
                if(statsButton && statsPanel){
                    let messageTemplate = this.cache.html.get('playerStats');
                    // @TODO: stats types will be part of the configuration in the database.
                    statsPanel.innerHTML = this.gameManager.gameEngine.parseTemplate(messageTemplate, {
                        stats: this.gameManager.playerData.stats
                    });
                    statsButton.addEventListener('click', () => {
                        if(statsPanel.style.display === 'none'){
                            statsPanel.style.display = 'block';
                            statsBox.style.left = '-80px';
                        } else {
                            statsPanel.style.display = 'none';
                            statsBox.style.left = '0px';
                        }
                    });
                }
            }
            EventsManager.emit('reldens.createUiScene', this);
        }
        // player animations:
        this.createPlayerAnimations();
    }

    getUiConfig(uiName)
    {
        return {
            enabled: this.gameManager.config.get('client/ui/'+uiName+'/enabled'),
            uiX: this.gameManager.config.get('client/ui/'+uiName+'/x'),
            uiY: this.gameManager.config.get('client/ui/'+uiName+'/y')
        }
    }

    createPlayerAnimations()
    {
        // @TODO:
        //   - All the animations will be part of the configuration in the database.
        //   - Implement player custom avatar.
        let availableAnimations = [
            {k: GameConst.LEFT, img: GameConst.IMAGE_PLAYER, start: 3, end: 5, repeat: -1, hide: false},
            {k: GameConst.RIGHT, img: GameConst.IMAGE_PLAYER, start: 6, end: 8, repeat: -1, hide: false},
            {k: GameConst.UP, img: GameConst.IMAGE_PLAYER, start: 9, end: 11, repeat: -1, hide: false},
            {k: GameConst.DOWN, img: GameConst.IMAGE_PLAYER, start: 0, end: 2, repeat: -1, hide: false},
            {k: GameConst.ATTACK, img: GameConst.ATTACK, start: 25, end: 29, repeat: 0},
            {k: GameConst.HIT, img: GameConst.HIT, start:17, end: 19, repeat: 0},
            {k: GameConst.DEATH, img: GameConst.DEATH, start: 10, end: 11, repeat: 0, rate: 1},
            {k: GameConst.BULLET, img: GameConst.BULLET, start: 1, end: 2, repeat: -1, rate: 1}
        ];
        if(this.gameManager.config.get('client/ui/pointer/show')){
            let arrowAnim = {k: GameConst.ARROW_DOWN, img: GameConst.ARROW_DOWN, start: 1, end: 4, repeat: 3, rate: 6};
            availableAnimations.push(arrowAnim);
        }
        for(let anim of availableAnimations){
            this.anims.create({
                key: anim.k,
                frames: this.anims.generateFrameNumbers(anim.img, {start: anim.start, end: anim.end}),
                frameRate: {}.hasOwnProperty.call(anim, 'rate') ? anim.rate : this.configuredFrameRate,
                repeat: anim.repeat,
                hideOnComplete: {}.hasOwnProperty.call(anim, 'hide') ? anim.hide : true,
            });
        }
    }

    registerControllers(controllersBox)
    {
        // @TODO: controllers will be part of the configuration in the database.
        this.setupDirButtonInBox(GameConst.UP, controllersBox);
        this.setupDirButtonInBox(GameConst.DOWN, controllersBox);
        this.setupDirButtonInBox(GameConst.LEFT, controllersBox);
        this.setupDirButtonInBox(GameConst.RIGHT, controllersBox);
        this.setupActionButtonInBox(GameConst.ACTION, controllersBox);
        this.setupActionButtonInBox(GameConst.BULLET, controllersBox);
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
        let btnBullet = box.getChildByProperty('id', action);
        if(btnBullet){
            if(this.gameManager.config.get('client/general/controls/action_button_hold')){
                this.hold(btnBullet, action);
            } else {
                btnBullet.addEventListener('click', () => {
                    let currentScene = this.gameManager.activeRoomEvents.getActiveScene();
                    let dataSend = {
                        act: GameConst.ACTION,
                        target: currentScene.player.currentTarget,
                        type: action
                    };
                    this.gameManager.activeRoomEvents.room.send(dataSend);
                });
            }
        }
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
        button.style.opacity = '1';
        let currentScene = this.gameManager.activeRoomEvents.getActiveScene();
        let dataSend = action;
        // @TODO: temporal until we make buttons fully configurable.
        if(!{}.hasOwnProperty.call(action, 'dir')){
            dataSend = {
                act: action,
                target: currentScene.player.currentTarget,
                type: GameConst.ACTION
            };
        }
        this.repeatHold(dataSend);
    }

    endHold(event, button)
    {
        event.preventDefault();
        button.style.opacity = '0.8';
        clearTimeout(this.holdTimer);
        this.gameManager.activeRoomEvents.room.send({act: GameConst.STOP});
    }

    repeatHold(sendData)
    {
        this.gameManager.activeRoomEvents.room.send(sendData);
        this.holdTimer = setTimeout(() => { this.repeatHold(sendData); }, (this.timeout || 0));
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
        // @TODO: fonts and messages has to be part of the configuration in the database.
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
        if(this.gameManager.config.get('client/ui/loading/showAssets')){
            this.assetText.setText('Loading asset: '+file.key);
        }
    }

    onLoadProgress(progress)
    {
        let progressText = parseInt(progress * 100) + '%';
        this.percentText.setText(progressText);
        let color = (0xffffff);
        this.progressRect.width = progress * this.progressCompleteRect.width;
        this.progressBar
            .clear()
            .fillStyle(0x222222)
            .fillRectShape(this.progressCompleteRect)
            .fillStyle(color)
            .fillRectShape(this.progressRect);
    }

}

module.exports.ScenePreloader = ScenePreloader;
