const {BaseSceneDriver} = require("../base-scene-driver");
const {Scene, Geom} = require('phaser');
const {sc} = require("@reldens/utils");

class PhaserSceneDriver extends BaseSceneDriver
{
    constructor(config)
    {
        super();
        this.driverName = "Phaser Scene Driver";
        this.scene = new WrapperScene(config);
    }

    setUpPreloadCallback(callback)
    {
        this.getScene().setUpPreloadCallback(callback);
    }

    setUpCreateCallback(callback)
    {
        this.getScene().setUpCreateCallback(callback);
    }

    loadHTML(key, url, xhrSettings)
    {
        this.getScene().load.html(key, url, xhrSettings);
    }

    loadTilemapTiledJSON(key, url, xhrSettings)
    {
        this.getScene().load.tilemapTiledJSON(key, url, xhrSettings);
    }

    loadSpritesheet(key, url, frameConfig, xhrSettings)
    {
        this.getScene().load.spritesheet(key, url, frameConfig, xhrSettings);
    }

    loadImage(key, url, xhrSettings)
    {
        this.getScene().load.image(key, url, xhrSettings);
    }

    loadOn(event, fn, context)
    {
        this.getScene().load.on(event, fn, context);
    }

    getCameraManager()
    {
        return this.getScene().cameras;
    }

    getMainCamera()
    {
        return this.getCameraManager().main;
    }

    getMainCameraWidth()
    {
        return this.getMainCamera().width;
    }

    getMainCameraHeight()
    {
        return this.getMainCamera().height;
    }

    addGraphics()
    {
        return this.getScene().add.graphics();
    }

    addDomCreateFromCache(x, y, config)
    {
        return this.getScene().add.dom(x, y, config.element, config.style, config.innerText).createFromCache(config.the);
    }

    getCacheHtml(key)
    {
        return this.getScene().cache.html.get(key);
    }

    createAnimation(config)
    {
        return this.getScene().anims.create(config);
    }

    generateAnimationFrameNumbers(key, config)
    {
        return this.getScene().anims.generateFrameNumbers(key, config);
    }

    addText(x, y, text, style)
    {
        return this.getScene().add.text(x, y, text, style);
    }

    getRectangle()
    {
        return Geom.Rectangle;
    }

    getScenePlugin()
    {
        return this.getScene().scene;
    }

    getChildren()
    {
        return this.getScene().children;
    }

    inputKeyboardOn(event, key)
    {
        return this.getScene().input.keyboard.on(event, key);
    }

    setUiElement(uiName, value)
    {
        this.getScene().setUiElement(uiName, value);
    }

    getUiElement(uiName, logError = true)
    {
        return this.getScene().getUiElement(uiName, logError);
    }

    getAllUiElements()
    {
        return this.getScene().getAllUiElements();
    }

    getScene()
    {
        return this.scene;
    }
}

class WrapperScene extends Scene
{

    constructor(config)
    {
        super(config);
        this.elementsUi = {};
    }

    setUpPreloadCallback(callback)
    {
        this.preloadCallback = callback;
    }

    setUpCreateCallback(callback)
    {
        this.createCallback = callback;
    }

    preload()
    {
        this.preloadCallback();
    }

    create()
    {
        this.createCallback();
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

    getAllUiElements()
    {
        return this.elementsUi;
    }

    setUiElement(uiName, value)
    {
        this.elementsUi[uiName] = value;
    }
}

module.exports.PhaserSceneDriver = PhaserSceneDriver;