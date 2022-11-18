const {PhaserSceneDriver} = require("./phaser-scene.driver");
const {ErrorManager, Logger, sc} = require("@reldens/utils");

class PhaserUiSceneDriver extends PhaserSceneDriver
{
    constructor(config)
    {
        super(config.sceneName);
        this.parseTemplateCallback = config.parseTemplateCallback;
        this.driverName = 'Phaser UI Scene Driver';
        this.tempMap = undefined;
    }

    setupElement(elementKey, x, y)
    {
        this.validateHoldingArray();
        const element = this.addDomCreateFromCache(x, y, {the: elementKey});
        this.tempMap[elementKey] = element;
        this.resetHoldingArray();
        return element;
    }

    setElementInnerHTMLFromTemplate(elementKey, templateConfig)
    {
        this.getUiElement(elementKey).innerHTML = this.parseLoadedContent(elementKey, templateConfig);
    }

    parseLoadedContent(elementKey, templateConfig)
    {
        const content = this.getCacheHtml(elementKey);
        if (!content) {
            Logger.error('Missing template "' + elementKey + '".');
            throw new Error('Missing template "' + elementKey + '"');
        }
        return this.parseTemplateCallback(content, templateConfig);
    }

    getElementChildByProperty(elementKey, property, value)
    {
        const element = this.getUiElement(elementKey);
        const childElement = element.getChildByProperty(property, value);
        if (!childElement) {
            throw new Error(`Missing "${property}" with value "${value}" on element "${elementKey}"`);
        }
        return childElement;
    }

    getElementChildByID(elementKey, value)
    {
        return this.getUiElement(elementKey).getChildByID(value);
    }

    //TODO - *PHASER* - Change all calls to .setDepth(value) (PHASER) instead using this method.
    setElementDepth(elementKey, value)
    {
        this.getUiElement(elementKey).setDepth(value);
    }

    // TODO - WIP - See how we can handle both maps (elementsUi && userInterfaces) using the same methods.
    usingElementUi()
    {
        this.tempMap = this.scene.elementsUi;
        return this;
    }

    // TODO - WIP - See how we can handle both maps (elementsUi && userInterfaces) using the same methods.
    usingUserInterfaces()
    {
        this.tempMap = this.scene.userInterfaces;
        return this;
    }

    getUiElement(elementKey, logError = true)
    {
        this.validateHoldingArray();
        const element = this.tempMap[elementKey];
        if (!element) {
            if (logError) {
                Logger.error('Missing template "' + elementKey + '".');
            }
            throw new Error(`Missing "${elementKey}" on "${this.tempMap}"`);
        }
        this.resetHoldingArray();
        return element;
    }

    hasUiElementLoaded(elementKey)
    {
        this.validateHoldingArray();
        const hasUiElement = sc.hasOwn(this.tempMap, elementKey) && sc.length(this.tempMap[elementKey]) > 0;
        this.resetHoldingArray();
        return hasUiElement;
    }

    updateAllUiElementsPosition(getUiConfigCallback)
    {
        for(let key of Object.keys(this.scene.elementsUi)){
            let {uiX, uiY} = getUiConfigCallback(key);
            let uiElement = this.scene.elementsUi[key];
            uiElement.x = uiX;
            uiElement.y = uiY;
        }
    }

    validateHoldingArray()
    {
        if (this.tempMap === undefined) {
            ErrorManager.error('Trying to use a method before setting which element list you want to use');
        }
    }

    resetHoldingArray()
    {
        this.tempMap = undefined;
    }
}

module.exports.PhaserUiSceneDriver = PhaserUiSceneDriver;