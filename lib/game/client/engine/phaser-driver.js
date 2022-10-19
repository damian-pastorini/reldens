const {BaseDriver} = require("./base-driver");
const {sc, ErrorManager} = require("@reldens/utils");
const {Game, Input, Scene} = require('phaser');
const {PhaserSceneDriver} = require("../scene/phaser-scene.driver");

class PhaserDriver extends BaseDriver
{

    constructor()
    {
        super();
        this.driverName = 'Phaser Driver';
    }

    loadEngine()
    {
        this.engine = new Game(this.config);
    }

    setGameSize(width, height)
    {
        this.engine.scale.setGameSize(width, height);
    }

    getScene(scene)
    {
        return this.engine.scene.getScene(scene);
    }

    addScene(key, sceneConfig, autoStart)
    {
        return this.engine.scene.add(key, sceneConfig, autoStart);
    }

    startScene(scene)
    {
        this.engine.scene.start(scene);
    }

    stopScene(scene)
    {
        this.engine.scene.stop(scene);
    }

    getTabKeyCode()
    {
        return Input.Keyboard.KeyCodes.TAB;
    }

    createNewSceneDriver(config)
    {
        return new PhaserSceneDriver(config);
    }

}

module.exports.PhaserDriver = PhaserDriver;
