import { Scene } from '../node_modules/phaser';

const UP = 'up';
const LEFT = 'left';
const DOWN = 'down';
const RIGHT = 'right';
const INIT = 'Init';
const MAP_TOWN = 'map-main';
const IMAGE_TOWN = 'main';
const IMAGE_PLAYER = 'player';


class Main extends Scene
{

    constructor()
    {
        super({ key: INIT });
        this.progressBar = null;
        this.progressCompleteRect = null;
        this.progressRect = null;
    }

    preload()
    {
        this.load.tilemapTiledJSON(MAP_TOWN, 'assets/maps/main.json');
        this.load.spritesheet(IMAGE_TOWN, 'assets/maps/main.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet(IMAGE_PLAYER, 'assets/sprites/player.png', { frameWidth: 32, frameHeight: 32 });
        this.load.on('progress', this.onLoadProgress, this);
        this.load.on('complete', this.onLoadComplete, this);
        this.createProgressBar();
    }

    create()
    {
        this.anims.create({
            key: LEFT,
            frames: this.anims.generateFrameNumbers(IMAGE_PLAYER, { start: 3, end: 5 }),
            frameRate: 13,
            repeat: -1
        });
        this.anims.create({
            key: RIGHT,
            frames: this.anims.generateFrameNumbers(IMAGE_PLAYER, { start: 6, end: 8 }),
            frameRate: 13,
            repeat: -1
        });
        this.anims.create({
            key: UP,
            frames: this.anims.generateFrameNumbers(IMAGE_PLAYER, { start: 9, end: 11 }),
            frameRate: 13,
            repeat: -1
        });
        this.anims.create({
            key: DOWN,
            frames: this.anims.generateFrameNumbers(IMAGE_PLAYER, { start: 0, end: 2 }),
            frameRate: 13,
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
        this.scene.start(TOWN);
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

export default Main;
