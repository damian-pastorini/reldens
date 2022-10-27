const {Scene} = require("phaser");
const {sc, Logger} = require("@reldens/utils");

class WrapperScene extends Scene
{

    constructor(config)
    {
        super(config);
        // TODO: ver si hay que eliminar estas propiedades de aca y moverlas al SceneDriver.
        this.elementsUi = {};
        this.createCallback = () => null;
        this.preloadCallback = () => null;
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
        if (sc.hasOwn(this.elementsUi, uiName)) {
            return this.elementsUi[uiName];
        }
        if (logError) {
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

module.exports.WrapperScene = WrapperScene;