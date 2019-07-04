const Phaser = require('phaser');
const share = require('../../shared/constants');

class ScenePreloader extends Phaser.Scene
{

    constructor(preloaderName, preloadMapKey, preloadImageKey, uiScene)
    {
        super({ key: preloaderName });
        this.preloadMapKey = preloadMapKey;
        this.preloadImageKey = preloadImageKey;
        this.uiScene = uiScene;
        this.progressBar = null;
        this.progressCompleteRect = null;
        this.progressRect = null;
    }

    preload()
    {
        if(this.uiScene){
            // ui elements:
            this.load.html('uiBoxRight', 'assets/html/ui-box-right.html');
            this.load.html('uiBoxLeft', 'assets/html/ui-box-left.html');
        }
        // maps:
        if(this.preloadMapKey){
            this.load.tilemapTiledJSON(this.preloadMapKey, `assets/maps/${this.preloadMapKey}.json`);
        }
        // @TODO: this will be modified to load multiple tiles images per map.
        // map tiles images:
        if(this.preloadImageKey){
            this.load.spritesheet(this.preloadImageKey, `assets/maps/${this.preloadImageKey}.png`, { frameWidth: 32, frameHeight: 32 });
        }
        // @TODO: player image will be part of the configuration in the database.
        this.load.spritesheet(share.IMAGE_PLAYER, 'assets/sprites/player.png', { frameWidth: 32, frameHeight: 32 });
        this.load.on('progress', this.onLoadProgress, this);
        this.load.on('complete', this.onLoadComplete, this);
        this.createProgressBar();
    }

    create()
    {
        if(this.uiScene) {
            // create ui:
            this.uiBoxRight = this.add.dom(450, 20).createFromCache('uiBoxRight');
            this.uiBoxLeft = this.add.dom(80, 450).createFromCache('uiBoxLeft');
        }
        // player animations:
        // @TODO: player animation will be part of the configuration in the database.
        this.anims.create({
            key: share.LEFT,
            frames: this.anims.generateFrameNumbers(share.IMAGE_PLAYER, { start: 3, end: 5 }),
            frameRate: 16,
            repeat: -1
        });
        this.anims.create({
            key: share.RIGHT,
            frames: this.anims.generateFrameNumbers(share.IMAGE_PLAYER, { start: 6, end: 8 }),
            frameRate: 16,
            repeat: -1
        });
        this.anims.create({
            key: share.UP,
            frames: this.anims.generateFrameNumbers(share.IMAGE_PLAYER, { start: 9, end: 11 }),
            frameRate: 16,
            repeat: -1
        });
        this.anims.create({
            key: share.DOWN,
            frames: this.anims.generateFrameNumbers(share.IMAGE_PLAYER, { start: 0, end: 2 }),
            frameRate: 16,
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
