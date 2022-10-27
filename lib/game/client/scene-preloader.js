const { GameConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');
const {GameDom} = require("./game-dom");

class ScenePreloader
{

    constructor(props)
    {
        this.progressBar = null;
        this.progressCompleteRect = null;
        this.progressRect = null;
        this.objectsUi = {};
        this.preloadMapKey = props.map;
        this.preloadImages = props.images;
        this.configManager = props.configManager;
        this.sceneDriver = props.sceneDriver;
        this.eventsManager = props.eventsManager;
        this.preloadAssets = props.preloadAssets;
        this.gameDom = GameDom;

        this.setupSceneDriver();

        let currentScene = props.getActiveSceneCallback();
        currentScene.objectsAnimationsData = props.objectsAnimationsData;

        this.playerSpriteSize = {
            frameWidth: this.configManager.get('client/players/size/width') || 52,
            frameHeight: this.configManager.get('client/players/size/height') || 71
        };
    }

    setupSceneDriver()
    {
        this.sceneDriver.setUpCreateCallback(() => this.onCreate());
        this.sceneDriver.setUpPreloadCallback(() => this.onPreload());
    }

    onPreload()
    {
        this.eventsManager.emitSync('reldens.beforePreload', this);
        this.preloadMapJson();
        // @TODO - BETA - CHECK - Test a multiple tiles images case.
        this.preloadMapImages();
        this.preloadValidAssets();
        this.preloadPlayerDefaultSprite();
        this.preloadArrowPointer();
        // @TODO - BETA - Move everything related to player stats into the users pack or create a new pack.
        this.sceneDriver.loadImage(GameConst.ICON_STATS, 'assets/icons/book.png');
        this.sceneDriver.loadOn('fileprogress', this.onFileProgress, this);
        this.sceneDriver.loadOn('progress', this.onLoadProgress, this);
        this.sceneDriver.loadOn('complete', this.onLoadComplete, this);
        this.configuredFrameRate = this.configManager.get('client/general/animations/frameRate') || 10;
        this.createProgressBar();
    }

    preloadMapJson()
    {
        if(!this.preloadMapKey){
            return;
        }
        this.sceneDriver.loadTilemapTiledJSON(this.preloadMapKey, `assets/maps/${this.preloadMapKey}.json`);
    }

    preloadArrowPointer()
    {
        if(!this.configManager.get('client/ui/pointer/show')){
            return;
        }
        // @TODO - BETA - Make pointer sprite data configurable.
        let pointerData = {frameWidth: 32, frameHeight: 32};
        this.sceneDriver.loadSpritesheet(GameConst.ARROW_DOWN, 'assets/sprites/arrow-down.png', pointerData);
    }

    preloadMapImages()
    {
        if(!this.preloadImages){
            return;
        }
        // @NOTE: this will mostly handle the map tiles images, here we need the preloadImages and tile data because
        // the JSON map file is not loaded yet.
        let tileData = {
            frameWidth: this.configManager.get('client/map/tileData/width') || 32,
            frameHeight: this.configManager.get('client/map/tileData/height') || 32,
            margin: this.configManager.get('client/map/tileData/margin') || 1,
            spacing: this.configManager.get('client/map/tileData/spacing') || 2
        };
        let files = this.preloadImages.split(',');
        // @TODO - BETA - Remove the hardcoded file extensions.
        for(let imageFile of files){
            this.sceneDriver.loadSpritesheet(imageFile, `assets/maps/${imageFile}.png`, tileData);
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
            this.sceneDriver.loadSpritesheet(asset.asset_key, `assets/custom/sprites/${asset.file_1}.png`, assetParams);
        }
    }

    onCreate()
    {
        this.eventsManager.emitSync('reldens.createPreload', this);
        this.createPlayerAnimations(GameConst.IMAGE_PLAYER);
        this.createArrowAnimation();
    }

    preloadPlayerDefaultSprite()
    {
        let fallbackImage = this.configManager.get('client/players/animations/fallbackImage') || 'player-base';
        this.sceneDriver.loadSpritesheet(
            GameConst.IMAGE_PLAYER,
            'assets/custom/sprites/'+fallbackImage+'.png',
            this.playerSpriteSize
        );
    }

    createPlayerAnimations(avatarKey)
    {
        let defaultFrames = this.configManager.get('client/players/animations/defaultFrames');
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
        if(!this.configManager.get('client/ui/pointer/show')){
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
        this.sceneDriver.createAnimation({
            key: anim.k,
            frames: this.sceneDriver.generateAnimationFrameNumbers(anim.img, {start: anim.start, end: anim.end}),
            frameRate: sc.hasOwn(anim, 'rate') ? anim.rate : this.configuredFrameRate,
            repeat: anim.repeat,
            hideOnComplete: sc.hasOwn(anim, 'hide') ? anim.hide : true,
        });
    }

    createProgressBar()
    {
        let Rectangle = this.sceneDriver.getRectangle();
        let main = Rectangle.Clone(this.sceneDriver.getMainCamera());
        this.progressRect = new Rectangle(0, 0, main.width / 2, 50);
        Rectangle.CenterOn(this.progressRect, main.centerX, main.centerY);
        this.progressCompleteRect = this.sceneDriver.getRectangle().Clone(this.progressRect);
        this.progressBar = this.sceneDriver.addGraphics();
        let width = this.sceneDriver.getMainCameraWidth();
        let height = this.sceneDriver.getMainCameraHeight();
        let loadingFont = this.configManager.get('client/ui/loading/font');
        let loadingFontSize = this.configManager.get('client/ui/loading/fontSize');
        let loadingAssetsSize = this.configManager.get('client/ui/loading/assetsSize');
        this.loadingText = this.sceneDriver.addText(width / 2, height / 2 - 50, 'Loading...', {
            fontFamily: loadingFont,
            fontSize: loadingFontSize
        });
        this.loadingText.setOrigin(0.5, 0.5);
        this.loadingText.setFill(this.configManager.get('client/ui/loading/loadingColor'));
        this.percentText = this.sceneDriver.addText(width / 2, height / 2 - 5, '0%', {
            fontFamily: loadingFont,
            fontSize: loadingAssetsSize
        });
        this.percentText.setOrigin(0.5, 0.5);
        this.percentText.setFill(this.configManager.get('client/ui/loading/percentColor'));
        this.assetText = this.sceneDriver.addText(width / 2, height / 2 + 50, '', {
            fontFamily: loadingFont,
            fontSize: loadingAssetsSize
        });
        this.assetText.setFill(this.configManager.get('client/ui/loading/assetsColor'));
        this.assetText.setOrigin(0.5, 0.5);
    }

    onLoadComplete()
    {
        for(let child of this.sceneDriver.getChildren().list){
            child.destroy();
        }
        this.loadingText.destroy();
        this.assetText.destroy();
        this.percentText.destroy();
        this.sceneDriver.getScenePlugin().shutdown();
    }

    onFileProgress(file)
    {
        if(!this.configManager.get('client/ui/loading/showAssets')){
            return;
        }
        this.assetText.setText('Loading asset: '+file.key);
    }

    onLoadProgress(progress)
    {
        let progressText = (progress * 100) + '%';
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
}

module.exports.ScenePreloader = ScenePreloader;
