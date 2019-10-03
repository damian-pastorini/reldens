/**
 *
 * Reldens - ScenePreloader
 *
 * This class extends Phaser.Scene to preload all the required assets, generate the UI and assign the actions.
 *
 */

const Phaser = require('phaser');
const share = require('../utils/constants');

class ScenePreloader extends Phaser.Scene
{

    constructor(preloaderName, preloadMapKey, preloadImages, uiScene, gameManager)
    {
        super({ key: preloaderName });
        this.preloadMapKey = preloadMapKey;
        this.preloadImages = preloadImages;
        this.uiScene = uiScene;
        this.progressBar = null;
        this.progressCompleteRect = null;
        this.progressRect = null;
        // @TODO: implement player custom avatar.
        // , username
        // this.username = username;
        this.gameManager = gameManager;
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
            if(this.gameManager.config.get('client/general/uiVisibility/uiBoxPlayerStats')){
                this.load.html('uiBoxPlayerStats', 'assets/html/ui-box-player-stats.html');
                this.load.html('playerStats', 'assets/html/player-stats.html');
            }
            // preload features templates:
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
        let playerSpriteSize = {
            frameWidth: this.gameManager.config.get('client/players/size/width') || 52,
            frameHeight: this.gameManager.config.get('client/players/size/height') || 71
        };
        // @TODO: implement player custom avatar.
        // this.load.spritesheet(this.username, 'assets/sprites/'+this.username+'.png', playerSpriteSize);
        this.load.spritesheet(share.IMAGE_PLAYER, 'assets/sprites/player-1.png', playerSpriteSize);
        // interface assets:
        this.load.image(share.ICON_STATS, 'assets/icons/book.png');
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
                this.uiBoxRight = this.add.dom(450, 20).createFromCache('uiBoxRight');
                // logout:
                let logoutButton = this.uiBoxRight.getChildByProperty('id', 'logout');
                logoutButton.addEventListener('click', () => {
                    window.location.reload();
                });
            }
            if(this.gameManager.config.get('client/general/uiVisibility/uiBoxLeft')) {
                this.uiBoxLeft = this.add.dom(120, 420).createFromCache('uiBoxLeft');
            }
            if(this.gameManager.config.get('client/general/uiVisibility/uiBoxPlayerStats')) {
                this.uiBoxPlayerStats = this.add.dom(420, 70).createFromCache('uiBoxPlayerStats');
            }
            // @NOTE: since this happens only once and just for the first preloader, here we register the features.
            this.gameManager.features.createFeaturesUi(this);
        }
        // player animations:
        // @TODO: player animation will be part of the configuration in the database.
        // @TODO: implement player custom avatar.
        this.anims.create({
            key: share.LEFT,
            frames: this.anims.generateFrameNumbers(share.IMAGE_PLAYER, {start: 3, end: 5}),
            frameRate: this.configuredFrameRate,
            repeat:-1
        });
        this.anims.create({
            key: share.RIGHT,
            frames: this.anims.generateFrameNumbers(share.IMAGE_PLAYER, {start: 6, end: 8}),
            frameRate: this.configuredFrameRate,
            repeat: -1
        });
        this.anims.create({
            key: share.UP,
            frames: this.anims.generateFrameNumbers(share.IMAGE_PLAYER, {start: 9, end: 11}),
            frameRate: this.configuredFrameRate,
            repeat: -1
        });
        this.anims.create({
            key: share.DOWN,
            frames: this.anims.generateFrameNumbers(share.IMAGE_PLAYER, {start: 0, end: 2}),
            frameRate: this.configuredFrameRate,
            repeat: -1
        });
    }

    createProgressBar()
    {
        let Rectangle = Phaser.Geom.Rectangle;
        let main = Rectangle.Clone(this.cameras.main);
        this.progressRect = new Rectangle(0, 0, main.width / 2, 50);
        Rectangle.CenterOn(this.progressRect, main.centerX, main.centerY);
        this.progressCompleteRect = Phaser.Geom.Rectangle.Clone(this.progressRect);
        this.progressBar = this.add.graphics();
    }

    onLoadComplete()
    {
        for(let child of this.children.list){
            child.destroy();
        }
        this.scene.shutdown();
    }

    onLoadProgress(progress)
    {
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

module.exports = ScenePreloader;
