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

    constructor(scene, playerData)
    {
        this.username = '';
        this.scene = scene;
        this.room = playerData.state.scene;
        this.state = playerData.state;
        this.mov = false;
        this.socket = {};
        this.playerId = '';
        this.players = {};
    }

    create()
    {
        this.addPlayer(this.playerId, this.state);
        this.scene.cameras.main.fadeFrom(share.FADE_DURATION);
        this.scene.scene.setVisible(true, this.room);
        this.scene.physics.world.setBounds(0, 0, this.scene.map.widthInPixels, this.scene.map.heightInPixels);
        this.scene.cameras.main.setBounds(0, 0, this.scene.map.widthInPixels, this.scene.map.heightInPixels);
        this.scene.cameras.main.startFollow(this.players[this.playerId], true);
        this.players[this.playerId].setCollideWorldBounds(true);
    }

    addPlayer(id, state)
    {
        this.players[id] = this.scene.physics.add.sprite(state.x, state.y, share.IMAGE_PLAYER);
        this.players[id].anims.play(state.dir);
        this.players[id].anims.stop();
        return this.players[id];
    }

    left(send = true)
    {
        if(send){
            this.socket.send({dir: share.LEFT});
        }
        this.players[this.playerId].anims.play(share.LEFT, true);
    }

    right(send = true)
    {
        if(send){
            this.socket.send({dir: share.RIGHT});
        }
        this.players[this.playerId].anims.play(share.RIGHT, true);
    }

    up(send = true)
    {
        if(send){
            this.socket.send({dir: share.UP});
        }
        this.players[this.playerId].anims.play(share.UP, true);
    }

    down(send = true)
    {
        if(send){
            this.socket.send({dir: share.DOWN});
        }
        this.players[this.playerId].anims.play(share.DOWN, true);
    }

    stop(send = true)
    {
        if(send){
            this.socket.send({act: share.STOP});
        }
        this.players[this.playerId].anims.stop();
    }

}

module.exports = PlayerEngine;
