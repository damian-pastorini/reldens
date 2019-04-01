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
        super.create(this.params.sceneMap, this.params.image, false);
        if(this.params.layers.animation){
            for(let a in this.params.layers.animation){
                let layerIndex = this.params.layers.animation[a];
                this.registerTilesetAnimation(this.layers[layerIndex]);
            }
        }
    }

    registerCollision()
    {
        for(let c in this.params.collisions){
            let newC = this.params.collisions[c];
            if(newC.C == 'btw'){
                // example: {"L":7, "C":"btw", "A":105, "B":110}
                this.layers[newC.L].setCollisionBetween(newC.A, newC.B);
            }
            if(newC.C == 'exc'){
                // example: {"L":2, "C":"exc", "A":[-1, 67, 68, 69]}
                this.layers[newC.L].setCollisionByExclusion(newC.A);
            }
        }
        let player = this.player.players[this.player.playerId];
        for(let lc in this.params.layers.collider){
            // example: "collider": [6,8,9]
            let collider = this.params.layers.collider[lc];
            this.physics.add.collider(player, this.layers[collider]);
        }
    }

    getPosition(data)
    {
        for(let i=0; i<this.params.returnPositions; i++){
            // examples:
            // {"P":"other_scene_key_1", "X":225, "Y":280, D:"down", "De":1},
            // {"P":"other_scene_key_2", "X":655, "Y":470, "D":"down"}
            let rp = this.params.returnPositions[i];
            if(
                // if previous scene is set and data match:
                (data && rp.P && data === rp.P)
                // or if data is null and position is default (De):
                || (Object.getOwnPropertyNames(data).length === 0 && rp.De==1)
            ){
                return {x: rp.X, y: rp.Y, direction: rp.D};
            }
        }
    }

}

module.exports = SceneDynamic;
