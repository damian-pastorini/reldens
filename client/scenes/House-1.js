const BaseScene = require('../utilities/base-scene');
// @TODO: move into the shared file.
const UP = 'up';
const TOWN = 'Town';
const HOUSE_1 = 'House_1';
const IMAGE_HOUSE = 'house';
const MAP_HOUSE_1 = 'map-house-1';

class House_1 extends BaseScene
{

    constructor()
    {
        super(HOUSE_1);
    }

    init()
    {
        super.init({x: 240, y: 365, direction: UP});
    }

    create()
    {
        super.create(MAP_HOUSE_1, IMAGE_HOUSE, true);
        this.registerTilesetAnimation(this.layers[2]);
    }

    registerCollision()
    {
        this.layers[1].setCollisionBetween(0, 100);
        this.layers[2].setCollisionByExclusion([-1, 67, 68, 69]);
        let player = this.player.players[this.player.playerId];
        this.physics.add.collider(player, this.layers[2]);
        this.physics.add.collider(player, this.layers[1], (sprite, tile) => {
            if (tile.index === 20) {
                this.nextSceneKey = TOWN;
                this.onChangeScene();
            }
        });
    }
}

module.exports = House_1;
