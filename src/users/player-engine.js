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

    constructor(scene, playerData, gameConfig, room)
    {
        this.scene = scene;
        this.config = gameConfig;
        this.username = playerData.username;
        this.roomName = playerData.state.scene;
        this.state = playerData.state;
        this.room = room;
        this.playerId = room.sessionId;
        this.players = {};
        this.mov = false;
    }

    create()
    {
        this.addPlayer(this.playerId, this.state);
        let fadeDuration = this.config.get('client/players/animations/fadeDuration') || share.FADE_DURATION;
        this.scene.cameras.main.fadeFrom(fadeDuration);
        this.scene.scene.setVisible(true, this.roomName);
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
        this.room.send({dir: share.LEFT});
    }

    right()
    {
        this.room.send({dir: share.RIGHT});
    }

    up()
    {
        this.room.send({dir: share.UP});
    }

    down()
    {
        this.room.send({dir: share.DOWN});
    }

    stop()
    {
        this.room.send({act: share.STOP});
    }

}

module.exports = PlayerEngine;
