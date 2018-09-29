const BaseScene = require('./base-scene');

class DynamicScene extends BaseScene
{

    constructor(key, data)
    {
        super(key);
        this.data = data;
    }

    init(data)
    {
        super.init(this.getPosition(data));
    }

    create()
    {
        super.create(this.data.map, this.data.image, false);
    }

    registerCollision()
    {
        for(let i=0; i<this.data.collisions; i++){
            let newC = this.data.collisions[i];
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
        for(let i=0; i<this.data.layers.collider; i++){
            // example: "collider": [6,8,9]
            let collider = this.data.layers.collider[i];
            this.physics.add.collider(player, this.layers[collider]);
        }
        this.physics.add.collider(player, this.layers[this.data.layers.main], (sprite, tile) => {
            for(let i=0; i<this.data.layers.change_points; i++){
                let cPoint = this.data.layers.change_points[i];
                // example: {"i":167, "n":"other_scene_key_1"}
                if (tile.index === cPoint.i) {
                    this.nextSceneKey = cPoint.n;
                    this.onChangeScene();
                }
            }
        });
    }

    getPosition(data)
    {
        for(let i=0; i<this.data.return_positions; i++){
            // examples:
            // {"P":"other_scene_key_1", "X":225, "Y":280, D:"down", "De":1},
            // {"P":"other_scene_key_2", "X":655, "Y":470, "D":"down"}
            let rp = this.data.return_positions[i];
            if (data === rp.P || (Object.getOwnPropertyNames(data).length === 0 && rp.De==1)){
                return {x: rp.X, y: rp.Y, direction: rp.D};
            }

        }
    }

}

module.exports = DynamicScene;
