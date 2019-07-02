const SceneBase = require('./scene-base');

class SceneDynamic extends SceneBase
{

    constructor(key, data)
    {
        super(key);
        this.params = data;
    }

    init(data)
    {
        super.init(this.getPosition(data));
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

    registerCollision()
    {
        for(let newC of this.params.collisions){
            if(newC.C === 'btw'){
                // example: {"L":7, "C":"btw", "A":105, "B":110}
                this.layers[newC.L].setCollisionBetween(newC.A, newC.B);
            }
            if(newC.C === 'exc'){
                // example: {"L":2, "C":"exc", "A":[-1, 67, 68, 69]}
                this.layers[newC.L].setCollisionByExclusion(newC.A);
            }
        }
        let player = this.player.players[this.player.playerId];
        for(let collider of this.params.layers.collider){
            // example: "collider": [6,8,9]
            this.physics.add.collider(player, this.layers[collider]);
        }
    }

    getPosition(data)
    {
        for(let rp of this.params.returnPositions){
            // examples:
            // {"P":"other_scene_key_1", "X":225, "Y":280, D:"down", "De":1},
            // {"P":"other_scene_key_2", "X":655, "Y":470, "D":"down"}
            if(
                // if previous scene is set and data match:
                (data && rp.P && data === rp.P)
                // or if data is null and position is default (De):
                || (Object.getOwnPropertyNames(data).length === 0 && rp.De === 1)
            ){
                return {x: rp.X, y: rp.Y, direction: rp.D};
            }
        }
    }

}

module.exports = SceneDynamic;
