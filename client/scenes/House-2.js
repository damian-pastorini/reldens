const BaseScene = require ('../utilities/base-scene');
const UP = 'up';
const TOWN = 'Town';
const HOUSE_2 = 'House_2';
const IMAGE_HOUSE = 'house';
const MAP_HOUSE_2 = 'map-house-2';

class House_2 extends BaseScene
{

    constructor()
    {
        super(HOUSE_2);
    }

    init()
    {
        super.init({ x: 240, y: 397, direction: UP });
    }

    create()
    {
        super.create(MAP_HOUSE_2, IMAGE_HOUSE, true);
        this.registerTilesetAnimation(this.layers[2]);
    }

    registerCollision()
    {
        this.layers[1].setCollisionByExclusion([-1]);
        this.layers[2].setCollisionByExclusion([-1, 117, 118, 146, 147]);
        let player = this.player.players[this.player.socket.id];
        this.physics.add.collider(player, this.layers[2]);
        this.physics.add.collider(player, this.layers[1], (sprite, tile) => {
            if (tile.index === 20) {
                this.nextSceneKey = TOWN;
                this.onChangeScene();
            }
        });
    }
}

module.exports = House_2;
