const Phaser = require('phaser');
const share = require('../../shared/constants');

class SceneInit extends Phaser.Scene
{

    constructor()
    {
        super({ key: share.SCENE_INIT });
        this.progressBar = null;
        this.progressCompleteRect = null;
        this.progressRect = null;
    }

    preload()
    {
        // @TODO: this should be loaded dynamically from the game server or included in the scenes creation.
        this.load.tilemapTiledJSON(share.MAP_TOWN, 'assets/maps/town.json');
        this.load.tilemapTiledJSON(share.MAP_HOUSE_1, 'assets/maps/house-1.json');
        this.load.tilemapTiledJSON(share.MAP_HOUSE_2, 'assets/maps/house-2.json');
        this.load.spritesheet(share.IMAGE_PLAYER, 'assets/sprites/player.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet(share.IMAGE_TOWN, 'assets/maps/town.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet(share.IMAGE_HOUSE, 'assets/maps/house.png', { frameWidth: 32, frameHeight: 32 });
        this.load.on('progress', this.onLoadProgress, this);
        this.load.on('complete', this.onLoadComplete, this);
        this.createProgressBar();
    }

    create()
    {
        // @TODO: create players animations in player object.
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

    onLoadComplete(loader)
    {
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

module.exports = SceneInit;
