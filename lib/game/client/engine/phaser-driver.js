const {BaseDriver} = require("./base-driver");
const {sc, ErrorManager} = require("@reldens/utils");
const {Game, Input} = require('phaser');

class PhaserDriver extends BaseDriver
{

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

    /*
        preLoadTemplate(props) {
            if (!props.templatePath) {
                ErrorManager.error("Undefined template path");
            }
            if (!props.scene) {
                ErrorManager.error("Undefined scene");
            }

        }*/
}

module.exports.PhaserDriver = PhaserDriver;
