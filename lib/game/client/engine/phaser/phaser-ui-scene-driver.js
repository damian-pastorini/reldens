const {PhaserSceneDriver} = require("./phaser-scene.driver");

class PhaserUiSceneDriver extends PhaserSceneDriver
{
    constructor(config)
    {
        super(config);
        this.driverName = 'Phaser UI Scene Driver';
    }
}

module.exports.PhaserUiSceneDriver = PhaserUiSceneDriver;