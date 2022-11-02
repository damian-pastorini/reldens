const { GameConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');
const {GameDom} = require("./game-dom");

class ScenePreloader
{

    constructor(props)
    {
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

        // TODO: WIP Change this call to be inside the sceneDriver. Don't send all the configManager. only config loading screen
        this.preloaderUiDriver = this.sceneDriver.instantiatePreloaderUiDriver(this.configManager);
    }

    setupSceneDriver()
    {
        this.sceneDriver.setUpCreateCallback(() => this.onCreate());
        this.sceneDriver.setUpPreloadCallback(() => this.onPreload());
        this.sceneDriver.setUpInitCallback(() => this.setupPreloaderUiDriver());
    }

    setupPreloaderUiDriver()
    {
        this.preloaderUiDriver.createUi();
        this.sceneDriver.loadOn('fileprogress', (file) => this.preloaderUiDriver.onFileProgress(file), this);
        this.sceneDriver.loadOn('progress', (progress) => this.preloaderUiDriver.onLoadProgress(progress), this);
        this.sceneDriver.loadOn('complete', () => this.preloaderUiDriver.onLoadComplete(), this);
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

        this.configuredFrameRate = this.configManager.get('client/general/animations/frameRate') || 10;
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

    preloadPlayerDefaultSprite()
    {
        let fallbackImage = this.configManager.get('client/players/animations/fallbackImage') || 'player-base';
        this.sceneDriver.loadSpritesheet(
            GameConst.IMAGE_PLAYER,
            'assets/custom/sprites/'+fallbackImage+'.png',
            this.playerSpriteSize
        );
    }

    onCreate()
    {
        this.eventsManager.emitSync('reldens.createPreload', this);
        this.createPlayerAnimations(GameConst.IMAGE_PLAYER);
        this.createArrowAnimation();
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
}

module.exports.ScenePreloader = ScenePreloader;
