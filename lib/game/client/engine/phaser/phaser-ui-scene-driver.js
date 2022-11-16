const {PhaserSceneDriver} = require("./phaser-scene.driver");
const {sc, ErrorManager} = require("@reldens/utils");

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

    setElementInnerContent(elementKey, templateConfig)
    {
        this.validateHoldingArray();
        const content = this.getCacheHtml(elementKey);
        this.tempMap[elementKey].innerHTML = this.parseTemplateCallback(content, templateConfig);
        this.resetHoldingArray();
    }

    parseLoadedContent(elementKey, templateConfig)
    {
        const content = this.getCacheHtml(elementKey);
        if (!content) {
            throw new Error('Missing template "' + elementkey + '"');
        }
        return this.parseTemplateCallback(content, templateConfig);
    }

    getElementChildByProperty(elementKey, property, value)
    {
        this.validateHoldingArray();
        const childElement = this.tempMap[elementKey].getChildByProperty(property, value);
        this.resetHoldingArray();
        return childElement;
    }

    getElementChildByID(elementKey, value)
    {
        this.validateHoldingArray();
        const childElement = this.tempMap[elementKey].getChildByID(value);
        this.resetHoldingArray();
        return childElement;
    }

    //TODO - *PHASER* - Change all calls to .setDepth(value) (PHASER) instead using this method.
    setElementDepth(elementKey, value)
    {
        this.validateHoldingArray();
        this.tempMap[elementKey].setDepth(value);
        this.resetHoldingArray();
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