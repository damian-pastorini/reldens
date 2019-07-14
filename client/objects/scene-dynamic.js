const SceneBase = require('./scene-base');

class SceneDynamic extends SceneBase
{

    constructor(key, data)
    {
        super(key);
        this.params = data;
    }

    create()
    {
        super.create(this.params.sceneMap, this.params.sceneKey, false);
        if(this.params.layers.animation){
            for(let layerIndex of this.params.layers.animation){
                this.registerTilesetAnimation(this.layers[layerIndex]);
            }
        }
    }

}

module.exports = SceneDynamic;
