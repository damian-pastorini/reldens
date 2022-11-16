const {BaseSceneDriver} = require("../base-scene-driver");
const {Geom} = require('phaser');
const {WrapperScene} = require("./wrapper-scene");
const {PhaserPreloaderUiDriver} = require("../../phaser/phaser-preloader-ui-driver");

class PhaserSceneDriver extends BaseSceneDriver
{
    constructor(config)
    {
        super();
        this.driverName = "Phaser Scene Driver";
        this.scene = new WrapperScene(config);
        this.directionalAnimations = {};
    }

    setUpPreloadCallback(callback)
    {
        this.scene.setUpPreloadCallback(callback);
    }

    setUpCreateCallback(callback)
    {
        this.scene.setUpCreateCallback(callback);
    }

    setUpInitCallback(callback)
    {
        this.scene.setUpInitCallback(callback);
    }

    //TODO: Change method's name to loadContent();
    loadHTML(key, url, xhrSettings)
    {
        this.scene.load.html(key, url, xhrSettings);
    }

    loadTilemapTiledJSON(key, url, xhrSettings)
    {
        this.scene.load.tilemapTiledJSON(key, url, xhrSettings);
    }

    loadSpritesheet(key, url, frameConfig, xhrSettings)
    {
        this.scene.load.spritesheet(key, url, frameConfig, xhrSettings);
    }

    loadImage(key, url, xhrSettings)
    {
        this.scene.load.image(key, url, xhrSettings);
    }

    loadOn(event, fn, context)
    {
        this.scene.load.on(event, fn, context);
    }

    getMainCamera()
    {
        return this.scene.cameras.main;
    }

    getMainCameraWidth()
    {
        return this.scene.cameras.main.width;
    }

    getMainCameraHeight()
    {
        return this.scene.cameras.main.height;
    }

    addGraphics()
    {
        return this.scene.add.graphics();
    }

    addDomCreateFromCache(x, y, config)
    {
        return this.scene.add.dom(x, y, config.element, config.style, config.innerText).createFromCache(config.the);
    }

    //TODO: Change method's name to getCachedValue();
    getCacheHtml(key)
    {
        return this.scene.cache.html.get(key);
    }

    createAnimation(config)
    {
        return this.scene.anims.create(config);
    }

    generateAnimationFrameNumbers(key, config)
    {
        return this.scene.anims.generateFrameNumbers(key, config);
    }

    addText(x, y, text, style)
    {
        return this.scene.add.text(x, y, text, style);
    }

    shutdownScene()
    {
        return this.scene.scene.stop();
    }

    getChildren()
    {
        return this.scene.children;
    }

    inputKeyboardOn(event, key)
    {
        return this.scene.input.keyboard.on(event, key);
    }

    setVisible(isVisible, sceneKey)
    {
        this.scene.scene.setVisible(isVisible, sceneKey);
    }

    instantiatePreloaderUiDriver(configManager)
    {
        return new PhaserPreloaderUiDriver({sceneDriver: this, configManager: configManager});
    }

    setUiElement(uiName, value)
    {
        this.scene.setUiElement(uiName, value);
    }

    getUiElement(uiName, logError = true)
    {
        return this.scene.getUiElement(uiName, logError);
    }

    getAllUiElements()
    {
        return this.scene.getAllUiElements();
    }

    getScene()
    {
        return this.scene;
    }
}

module.exports.PhaserSceneDriver = PhaserSceneDriver;