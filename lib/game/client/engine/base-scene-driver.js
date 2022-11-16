const {ErrorManager} = require('@reldens/utils');
class BaseSceneDriver
{

    constructor(config)
    {
        this.driverName = 'Base Scene Driver';
    }

    setUpPreloadCallback(callback)
    {
        ErrorManager.error(this.getMethodErrorMessage('setUpPreloadCallback'));
    }

    setUpCreateCallback(callback)
    {
        ErrorManager.error(this.getMethodErrorMessage('setUpCreateCallback'));
    }

    setupElement(elementKey, x, y)
    {
        ErrorManager.error(this.getMethodErrorMessage('setupElement'));
        return {};
    }

    setElementInnerContent(elementKey, templateConfig)
    {
        ErrorManager.error(this.getMethodErrorMessage('setElementInnerContent'));
    }

    parseLoadedContent(elementKey, templateConfig)
    {
        ErrorManager.error(this.getMethodErrorMessage('parseLoadedContent'));
        return {};
    }

    getElementChildByProperty(elementKey, property, value)
    {
        ErrorManager.error(this.getMethodErrorMessage('getElementChildByProperty'));
        return {};
    }

    getElementChildByID(elementKey, value)
    {
        ErrorManager.error(this.getMethodErrorMessage('getElementChildByID'));
        return {};
    }

    setElementDepth(elementKey, value)
    {
        ErrorManager.error(this.getMethodErrorMessage('setElementDepth'));
        return {};
    }

    loadHTML(key, url, xhrSettings)
    {
        ErrorManager.error(this.getMethodErrorMessage('loadHTML'));
    }

    loadTilemapTiledJSON(key, url, xhrSettings)
    {
        ErrorManager.error(this.getMethodErrorMessage('loadTilemapTiledJSON'));
    }

    loadSpritesheet(key, url, frameConfig, xhrSettings)
    {
        ErrorManager.error(this.getMethodErrorMessage('loadSpritesheet'));
    }

    loadImage(key, url, xhrSettings)
    {
        ErrorManager.error(this.getMethodErrorMessage('loadImage'));
    }

    loadOn(event, fn, context)
    {
        ErrorManager.error(this.getMethodErrorMessage('loadOn'));
    }

    getMainCamera()
    {
        ErrorManager.error(this.getMethodErrorMessage('getMainCamera'));
    }

    getMainCameraWidth()
    {
        ErrorManager.error(this.getMethodErrorMessage('getMainCameraWidth'));
    }

    getMainCameraHeight()
    {
        ErrorManager.error(this.getMethodErrorMessage('getMainCameraHeight'));
    }

    addGraphics()
    {
        ErrorManager.error(this.getMethodErrorMessage('addGraphics'));
    }

    addDomCreateFromCache(x, y, config)
    {
        ErrorManager.error(this.getMethodErrorMessage('addDomCreateFromCache'));
        return {};
    }

    getCacheHtml(key)
    {
        ErrorManager.error(this.getMethodErrorMessage('getCacheHtml'));
        return {};
    }

    createAnimation(config)
    {
        ErrorManager.error(this.getMethodErrorMessage('createAnimation'));
        return {};
    }

    generateAnimationFrameNumbers(key, config)
    {
        ErrorManager.error(this.getMethodErrorMessage('generateAnimationFrameNumbers'));
        return {};
    }

    addText(x, y, text, style)
    {
        ErrorManager.error(this.getMethodErrorMessage('addText'));
        return {};
    }

    getScenePlugin()
    {
        ErrorManager.error(this.getMethodErrorMessage('getScenePlugin'));
    }

    getChildren()
    {
        ErrorManager.error(this.getMethodErrorMessage('getChildren'));
    }

    inputKeyboardOn(event, key)
    {
        ErrorManager.error(this.getMethodErrorMessage('inputKeyboardOn'));
    }

    setVisible(_, __)
    {
        ErrorManager.error(this.getMethodErrorMessage('setVisible'));
    }

    instantiatePreloaderUiDriver()
    {
        ErrorManager.error(this.getMethodErrorMessage('instantiatePreloaderUiDriver'));
    }

    setUiElement(uiName, value)
    {
        ErrorManager.error(this.getMethodErrorMessage('setUiElement'));
    }

    getUiElement(uiName, logError = true)
    {
        ErrorManager.error(this.getMethodErrorMessage('getUiElement'));
    }

    getAllUiElements()
    {
        ErrorManager.error(this.getMethodErrorMessage('getAllUiElements'));
    }

    getMethodErrorMessage(method)
    {
        return 'Method "'+method+'" is not implemented in "'+this.driverName+'"';
    }
}

module.exports.BaseSceneDriver = BaseSceneDriver;