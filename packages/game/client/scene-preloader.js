/**
 *
 * Reldens - ScenePreloader
 *
 * This class extends Phaser Scene to preload all the required assets, generate the UI and assign the actions.
 *
 */

const { Scene, Geom } = require('phaser');
const { GameConst } = require('../constants');

class ScenePreloader extends Scene
{

    // @TODO: - Seiyria - one thing that typescript would REALLY help with, is you could have an interface for what
    //   this props object contains. right now, it could contain anything, but all I know for sure is that it contains
    //   the props assigned in this ctor.
    constructor(props)
    {
        super({key: props.name});
        this.preloaderName = props.name;
        this.preloadMapKey = props.map;
        this.preloadImages = props.images;
        this.uiScene = props.uiScene;
        this.progressBar = null;
        this.progressCompleteRect = null;
        this.progressRect = null;
        this.gameManager = props.gameManager;
        this.preloadAssets = props.preloadAssets;
        let currentScene = this.gameManager.activeRoomEvents.getActiveScene();
        currentScene.objectsAnimationsData = props.objectsAnimationsData;
    }

    preload()
    {
        if(this.uiScene){
            // ui elements:
            if(this.gameManager.config.get('client/general/uiVisibility/uiBoxRight')){
                this.load.html('uiBoxRight', 'assets/html/ui-box-right.html');
            }
            if(this.gameManager.config.get('client/general/uiVisibility/uiBoxLeft')){
                this.load.html('uiBoxLeft', 'assets/html/ui-box-left.html');
            }
            if(this.gameManager.config.get('client/general/uiVisibility/sceneLabel')){
                this.load.html('uiSceneLabel', 'assets/html/ui-scene-label.html');
            }
            if(this.gameManager.config.get('client/general/uiVisibility/uiBoxPlayerStats')){
                this.load.html('uiBoxPlayerStats', 'assets/html/ui-box-player-stats.html');
                this.load.html('playerStats', 'assets/html/player-stats.html');
            }
            // preload features assets:
            this.gameManager.features.preloadAssets(this);
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
                        console.log('ERROR - Missing spritesheet params:', asset);
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
        if(this.uiScene) {
            // create ui:
            if(this.gameManager.config.get('client/general/uiVisibility/uiBoxRight')){
                // @TODO: make all positions configurable.
                this.uiBoxRight = this.add.dom(450, 20).createFromCache('uiBoxRight');
                // logout:
                let logoutButton = this.uiBoxRight.getChildByProperty('id', 'logout');
                logoutButton.addEventListener('click', () => {
                    window.location.reload();
                });
            }
            if(this.gameManager.config.get('client/general/uiVisibility/uiBoxLeft')){
                this.uiBoxLeft = this.add.dom(90, 380).createFromCache('uiBoxLeft');
                this.registerControllers(this.uiBoxLeft);
            }
            if(this.gameManager.config.get('client/general/uiVisibility/sceneLabel')){
                this.uiSceneLabel = this.add.dom(20, 20).createFromCache('uiSceneLabel');
            }
            if(this.gameManager.config.get('client/general/uiVisibility/uiBoxPlayerStats')){
                this.uiBoxPlayerStats = this.add.dom(420, 70).createFromCache('uiBoxPlayerStats');
                let statsBox = this.uiBoxPlayerStats.getChildByProperty('id', 'box-player-stats');
                let statsButton = this.uiBoxPlayerStats.getChildByProperty('id', 'player-stats-btn');
                let statsPanel = this.uiBoxPlayerStats.getChildByProperty('id', 'player-stats-container');
                if(statsButton && statsPanel){
                    let messageTemplate = this.cache.html.get('playerStats');
                    // @TODO: stats types will be part of the configuration in the database.
                    statsPanel.innerHTML = this.gameManager.gameEngine.TemplateEngine.render(messageTemplate, {
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
            // @NOTE: since this happens only once and just for the first preloader, here we register the features UI.
            this.gameManager.features.createFeaturesUi(this);
        }
        // player animations:
        // @TODO:
        //   - Player animation will be part of the configuration in the database.
        //   - Implement player custom avatar.
        this.anims.create({
            key: GameConst.LEFT,
            frames: this.anims.generateFrameNumbers(GameConst.IMAGE_PLAYER, {start: 3, end: 5}),
            frameRate: this.configuredFrameRate,
            repeat: -1
        });
        this.anims.create({
            key: GameConst.RIGHT,
            frames: this.anims.generateFrameNumbers(GameConst.IMAGE_PLAYER, {start: 6, end: 8}),
            frameRate: this.configuredFrameRate,
            repeat: -1
        });
        this.anims.create({
            key: GameConst.UP,
            frames: this.anims.generateFrameNumbers(GameConst.IMAGE_PLAYER, {start: 9, end: 11}),
            frameRate: this.configuredFrameRate,
            repeat: -1
        });
        this.anims.create({
            key: GameConst.DOWN,
            frames: this.anims.generateFrameNumbers(GameConst.IMAGE_PLAYER, {start: 0, end: 2}),
            frameRate: this.configuredFrameRate,
            repeat: -1
        });
    }

    registerControllers(controllersBox)
    {
        // @TODO: controllers will be part of the configuration in the database.
        let btnUp = controllersBox.getChildByProperty('id', GameConst.UP);
        if(btnUp){
            this.hold(btnUp, {dir: GameConst.UP});
        }
        let btnDown = controllersBox.getChildByProperty('id', GameConst.DOWN);
        if(btnDown){
            this.hold(btnDown, {dir: GameConst.DOWN});
        }
        let btnLeft = controllersBox.getChildByProperty('id', GameConst.LEFT);
        if(btnLeft){
            this.hold(btnLeft, {dir: GameConst.LEFT});
        }
        let btnRight = controllersBox.getChildByProperty('id', GameConst.RIGHT);
        if(btnRight){
            this.hold(btnRight, {dir: GameConst.RIGHT});
        }
        let btnAction = controllersBox.getChildByProperty('id', GameConst.ACTION);
        if(btnAction){
            if(this.gameManager.config.get('client/general/controls/action_button_hold')){
                this.hold(btnAction, {act: GameConst.ACTION});
            } else {
                btnAction.addEventListener('click', (e) => {
                    this.gameManager.activeRoomEvents.room.send({act: GameConst.ACTION});
                });
            }
        }
    }

    hold(btn, sendData)
    {
        let t;
        let repeat = () => {
            this.gameManager.activeRoomEvents.room.send(sendData);
            t = setTimeout(repeat, this.timeout);
        };
        btn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            btn.style.opacity = '1';
            repeat();
        });
        btn.addEventListener('mouseup', (e) => {
            e.preventDefault();
            btn.style.opacity = '0.8';
            clearTimeout(t);
            this.gameManager.activeRoomEvents.room.send({act: GameConst.STOP});
        });
        btn.addEventListener('mouseout', (e) => {
            e.preventDefault();
            clearTimeout(t);
            this.gameManager.activeRoomEvents.room.send({act: GameConst.STOP});
        });
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            btn.style.opacity = '1';
            repeat();
        });
        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            btn.style.opacity = '0.8';
            clearTimeout(t);
            this.gameManager.activeRoomEvents.room.send({act: GameConst.STOP});
        });
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
        this.loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
            fontFamily: 'Verdana, Geneva, sans-serif',
            fontSize: '20px'
        });
        this.loadingText.setOrigin(0.5, 0.5);
        this.loadingText.setFill('#ffffff');
        this.percentText = this.add.text(width / 2, height / 2 - 5, '0%', {
            fontFamily: 'Verdana, Geneva, sans-serif',
            fontSize: '18px'
        });
        this.percentText.setOrigin(0.5, 0.5);
        this.percentText.setFill('#666666');
        this.assetText = this.add.text(width / 2, height / 2 + 50, '', {
            fontFamily: 'Verdana, Geneva, sans-serif',
            fontSize: '18px'
        });
        this.assetText.setFill('#ffffff');
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
        this.assetText.setText('Loading asset: '+file.key);
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
