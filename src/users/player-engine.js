/**
 *
 * Reldens - PlayerEngine
 *
 * PlayerEngine is the class that handle the player actions in the client side.
 *
 */

const share = require('../utils/constants');

class PlayerEngine
{

    constructor(scene, playerData, gameConfig)
    {
        this.username = '';
        this.scene = scene;
        this.room = playerData.state.scene;
        this.state = playerData.state;
        this.mov = false;
        this.socket = {};
        this.playerId = '';
        this.players = {};
        this.config = gameConfig;
    }

    create()
    {
        this.addPlayer(this.playerId, this.state);
        let fadeDuration = this.config.get('client/players/animations/fadeDuration') || share.FADE_DURATION;
        this.scene.cameras.main.fadeFrom(fadeDuration);
        this.scene.scene.setVisible(true, this.room);
        this.scene.physics.world.setBounds(0, 0, this.scene.map.widthInPixels, this.scene.map.heightInPixels);
        this.scene.cameras.main.setBounds(0, 0, this.scene.map.widthInPixels, this.scene.map.heightInPixels);
        this.scene.cameras.main.startFollow(this.players[this.playerId], true);
        this.players[this.playerId].setCollideWorldBounds(true);
    }

    addPlayer(id, state)
    {
        // @TODO: implement player custom avatar.
        this.players[id] = this.scene.physics.add.sprite(state.x, state.y, share.IMAGE_PLAYER);
        this.players[id].anims.play(state.dir);
        this.players[id].anims.stop();
        return this.players[id];
    }

    left()
    {
        this.socket.send({dir: share.LEFT});
    }

    right()
    {
        this.socket.send({dir: share.RIGHT});
    }

    up()
    {
        this.socket.send({dir: share.UP});
    }

    down()
    {
        this.socket.send({dir: share.DOWN});
    }

    stop()
    {
        this.socket.send({act: share.STOP});
    }

}

module.exports = PlayerEngine;
