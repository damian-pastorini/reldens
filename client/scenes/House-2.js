const SceneBase = require('../objects/scene-base');
var share = require('../../shared/constants');

class House_2 extends SceneBase
{

    constructor()
    {
        super(share.HOUSE_2);
    }

    init()
    {
        super.init({x: 240, y: 397, direction: share.UP});
    }

    create()
    {
        super.create(share.MAP_HOUSE_2, share.IMAGE_HOUSE, true);
        this.registerTilesetAnimation(this.layers[2]);
    }

    registerCollision()
    {
        this.layers[1].setCollisionByExclusion([-1]);
        this.layers[2].setCollisionByExclusion([-1, 117, 118, 146, 147]);
        let player = this.player.players[this.player.playerId];
        this.physics.add.collider(player, this.layers[2]);
        this.physics.add.collider(player, this.layers[1], (sprite, tile) => {
            if (tile.index === 20) {
                this.nextSceneKey = share.TOWN;
                this.onChangeScene();
            }
        });
    }
}

module.exports = House_2;
