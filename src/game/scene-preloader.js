const Phaser = require('phaser');
const share = require('../utils/constants');

class ScenePreloader extends Phaser.Scene
{

    constructor(preloaderName, preloadMapKey, preloadImages, uiScene)
    {
        super({ key: preloaderName });
        this.preloadMapKey = preloadMapKey;
        this.preloadImages = preloadImages;
        this.uiScene = uiScene;
        this.progressBar = null;
        this.progressCompleteRect = null;
        this.progressRect = null;
    }

    preload()
    {
        if(this.uiScene){
            // @TODO: ui elements visibility and availability will be part of the configuration in the database.
            // ui elements:
            this.load.html('uiBoxRight', 'assets/html/ui-box-right.html');
            this.load.html('uiBoxPlayerStats', 'assets/html/ui-box-player-stats.html');
            this.load.html('uiBoxLeft', 'assets/html/ui-box-left.html');
            this.load.html('uiChat', 'assets/html/ui-chat.html');
        }
        // maps:
        if(this.preloadMapKey){
            this.load.tilemapTiledJSON(this.preloadMapKey, `assets/maps/${this.preloadMapKey}.json`);
        }
        // @TODO: test a multiple tiles images case.
        // map tiles images:
        if(this.preloadImages){
            // @TODO: frame width, height, margin and spacing will be part of the configuration in the database.
            // @NOTE: we need the preloadImages and tile data here because the JSON map file is not loaded yet.
            let tileData = {frameWidth:16, frameHeight:16, margin:1, spacing:2};
            let files = this.preloadImages.split(',');
            for(let imageFile of files){
                let filePath = `assets/maps/${imageFile}.png`;
                this.load.spritesheet(imageFile, filePath, tileData);
            }
        }
        // @TODO: player image will be part of the configuration in the database.
        let playerSpriteSize = {frameWidth:52, frameHeight:71};
        this.load.spritesheet(share.IMAGE_PLAYER, 'assets/sprites/player-1.png', playerSpriteSize);
        // interface assets:
        this.load.image(share.ICON_STATS, 'assets/icons/book.png');
        this.load.on('progress', this.onLoadProgress, this);
        this.load.on('complete', this.onLoadComplete, this);
        // @TODO: the player frame rate will be part of the configuration in the database.
        this.configuredFrameRate = 10;
        this.createProgressBar();
    }

    create()
    {
        if(this.uiScene) {
            // create ui:
            // @TODO: UI (elements visibility and position) will be part of the configuration in the database.
            this.uiBoxRight = this.add.dom(450, 20).createFromCache('uiBoxRight');
            this.uiBoxPlayerStats = this.add.dom(420, 70).createFromCache('uiBoxPlayerStats');
            this.uiBoxLeft = this.add.dom(120, 420).createFromCache('uiBoxLeft');
            this.uiChat = this.add.dom(360, 420).createFromCache('uiChat');
            // logout:
            let logoutButton = this.uiBoxRight.getChildByProperty('id', 'logout');
            logoutButton.addEventListener('click', () => {
                window.location.reload();
            });
        }
        // player animations:
        // @TODO: player animation will be part of the configuration in the database.
        this.anims.create({
            key: share.LEFT,
            frames: this.anims.generateFrameNumbers(share.IMAGE_PLAYER, {start:3, end:5}),
            frameRate: this.configuredFrameRate,
            repeat:-1
        });
        this.anims.create({
            key: share.RIGHT,
            frames: this.anims.generateFrameNumbers(share.IMAGE_PLAYER, {start:6, end:8}),
            frameRate: this.configuredFrameRate,
            repeat: -1
        });
        this.anims.create({
            key: share.UP,
            frames: this.anims.generateFrameNumbers(share.IMAGE_PLAYER, {start:9, end:11}),
            frameRate: this.configuredFrameRate,
            repeat: -1
        });
        this.anims.create({
            key: share.DOWN,
            frames: this.anims.generateFrameNumbers(share.IMAGE_PLAYER, {start:0, end:2}),
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
